import _ from "lodash";
import {
  applyStyleURLToTabID,
  getGistById,
  getGistIDFromURL,
  loadStylefileFromGist,
  SPECIAL_QUERY_PARAMS
} from "./lib/gists";
import {
  MESSAGE_TYPES,
  portName,
  tabIdFromPortName,
  PORT_TYPES
} from "./lib/port";
import { shouldApplyStyleToURL } from "./lib/stylefile";
import Bluebird from "bluebird";
import diffSheet from "stylesheet-differ";
import { loadScript } from "./background/inject";
import Messenger from "chrome-ext-messenger";
import { toFile } from "./lib/toFile";
import {
  uploadStylesheets,
  uploadScreenshot,
  SCREENSHOT_CONTENT_TYPE
} from "./lib/api";
import {
  setBrowserActionToDefault,
  setBrowserActionToUploadStyle,
  setBrowserActionToStyleApplied,
  getBrowserActionState,
  BROWSER_ACTION_STATES
} from "./lib/browserAction";

global.Promise = Bluebird;

let devtoolConnection;
let gistConnection;
const messenger = new Messenger();

messenger.initBackgroundHub({
  connectedHandler: function(extensionPart, connectionName, tabId) {},
  disconnectedHandler: function(extensionPart, connectionName, tabId) {
    if (
      extensionPart === "devtool" &&
      getBrowserActionState() === BROWSER_ACTION_STATES.upload_style
    ) {
      setBrowserActionToDefault({ tabId });
    }
  }
});

const log = (...messages) =>
  console.log.apply(console, ["[Background]", ...messages]);

const TAB_IDS_TO_APPLY_STYLES = {};
const TAB_ORIGINAL_STYLES = {};

const startMonitoringTabID = (tabId, gistId) => {
  if (!TAB_IDS_TO_APPLY_STYLES[tabId]) {
    TAB_IDS_TO_APPLY_STYLES[tabId] = [];
  }

  if (!TAB_IDS_TO_APPLY_STYLES[tabId].includes(gistId)) {
    TAB_IDS_TO_APPLY_STYLES[tabId].push(gistId);
  }
};

const stopMonitoringTabID = (tabId, gistId) => {
  if (
    TAB_IDS_TO_APPLY_STYLES[tabId] &&
    TAB_IDS_TO_APPLY_STYLES[tabId].includes(gistId)
  ) {
    TAB_IDS_TO_APPLY_STYLES[tabId].splice(
      TAB_IDS_TO_APPLY_STYLES[tabId].indexOf(gistId),
      1
    );

    if (TAB_IDS_TO_APPLY_STYLES[tabId].length === 0) {
      delete TAB_IDS_TO_APPLY_STYLES[tabId];
    }
  }
};

const getTab = tabId =>
  new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, resolve);
  });

const getTabId = sender => parseInt(_.last(sender.split("::")), 10);

const handleGistContentScriptMessages = async (
  request,
  from,
  sender,
  sendResponse
) => {
  const { type = null } = request;

  const types = MESSAGE_TYPES;

  if (!type) {
    return;
  }

  if (!_.values(types).includes(type)) {
    console.error("[background] request type must be one of", _.values(types));
    return;
  }

  if (type === types.get_gist_content) {
    if (!request.url) {
      console.error("[background] invalid get_gist_content: missing url");
      sendResponse({ success: false });
      return;
    }

    return window
      .fetch(request.url, {
        redirect: "follow",
        credentials: "include"
      })
      .then(response => response.text())
      .then(value => {
        return sendResponse({
          url: request.url,
          response: true,
          value
        });
      });
  }
};

const handleDevtoolMessages = async (request, from, sender, sendResponse) => {
  const { type = null } = request;
  const types = MESSAGE_TYPES;

  if (!type) {
    return;
  }

  if (!_.values(types).includes(type)) {
    console.error("[background] request type must be one of", _.values(types));
    return;
  }

  const tabId = getTabId(from);
  const tab = await getTab(tabId);

  if (type === types.log) {
    console.log.apply(console, request.value);
  } else if (type === types.send_content_stylesheets) {
    log("Received content stylesheets", request.value);
    if (!TAB_ORIGINAL_STYLES[tabId]) {
      TAB_ORIGINAL_STYLES[tabId] = request.value;
    } else {
      const contentStyles = request.value;
      const existingSheets = TAB_ORIGINAL_STYLES[tabId];
      contentStyles.forEach(style => {
        const index = _.findIndex(
          existingSheets,
          sheet => sheet.url === style.url
        );
        if (index === -1) {
          TAB_ORIGINAL_STYLES[tabId][sUrl] = contentStyles[sUrl];
        }
      });
    }
  } else if (type === types.style_diff_changed) {
    if (request.value.stylesheets.length > 0) {
      setBrowserActionToUploadStyle({
        tabId: tabId,
        styleCount: request.value.stylesheets.length
      });
      // chrome.browserAction.setPopup({ tabId: tabId, popup: "" });
    } else {
      setBrowserActionToDefault({ tabId: tabId });
      // chrome.browserAction.setPopup({ tabId, popup: "popup.html" });
    }
  } else if (type === types.get_styles_diff) {
    log("Received styles!");
    if (!tab || !tab.url) {
      alert("Something didnt work quite right. Please try again!");
    }
    let modifiedSheets = request.value.stylesheets.slice();
    const currentStyles = request.value.general_stylesheets;
    const oldStyles = TAB_ORIGINAL_STYLES[tabId];
    if (oldStyles) {
      oldStyles.forEach(oldStyle => {
        const newStyle = currentStyles.find(
          style => style.url === oldStyle.url
        );
        const diffedStyle = diffSheet(oldStyle.content, newStyle.content);
        if (diffedStyle && diffedStyle.trim().length > 0) {
          modifiedSheets.push({ url: oldStyle.url, content: diffedStyle });
        }
      });
    }
    return uploadStylesheets({
      stylesheets: modifiedSheets,
      url: tab.url
    }).then(stylesheetResponse => {
      if (stylesheetResponse.success) {
        chrome.tabs.captureVisibleTab(null, { format: "png" }, async function(
          photo
        ) {
          chrome.tabs.create({ url: stylesheetResponse.data.url });
          // Capturing the photo fails sometimes shrug
          if (photo) {
            uploadScreenshot({
              photo: await toFile(photo, SCREENSHOT_CONTENT_TYPE),
              key: stylesheetResponse.data.id,
              domain: stylesheetResponse.data.domain
            });
          }
        });
      } else {
        alert("Something didnt work quite right. Please try again!");
      }
    });
  }
};

const createStyleURL = tab => {
  return devtoolConnection.sendMessage(
    `devtool:${PORT_TYPES.devtool_widget}:${tab.id}`,
    { type: MESSAGE_TYPES.get_styles_diff }
  );
};

chrome.browserAction.onClicked.addListener(tab => {
  console.log("Clicked Browser Action", getBrowserActionState());
  if (getBrowserActionState() === BROWSER_ACTION_STATES.default) {
  } else if (getBrowserActionState() === BROWSER_ACTION_STATES.upload_style) {
    createStyleURL(tab);
  } else if (getBrowserActionState() === BROWSER_ACTION_STATES.style_applied) {
    chrome.tabs.query(
      {
        active: true,
        lastFocusedWindow: true
      },
      function(tabs) {
        const tab = tabs[0];
        if (!tab) {
          return;
        }
        loadScript("inject", tab.id);
      }
    );
  }
});

chrome.webNavigation.onBeforeNavigate.addListener(
  async ({ tabId, url }) => {
    const gistID = getGistIDFromURL(url);

    if (!gistID) {
      log("Gist ID not found");
      return;
    }

    startMonitoringTabID(tabId, gistID);
  },
  {
    url: Object.values(SPECIAL_QUERY_PARAMS).map(queryContains => ({
      queryContains
    }))
  }
);

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!TAB_IDS_TO_APPLY_STYLES[tabId]) {
    return;
  }

  if (!tab.url) {
    return;
  }

  if (changeInfo.status !== "loading") {
    return;
  }

  Promise.all(
    TAB_IDS_TO_APPLY_STYLES[tabId].map(async gistId => {
      const gist = await getGistById(gistId);
      const stylefile = loadStylefileFromGist(gist);

      if (!stylefile) {
        return false;
      }

      if (!shouldApplyStyleToURL(stylefile, tab.url)) {
        return false;
      }

      applyStyleURLToTabID(gist, tabId);
      return true;
    })
  )
    .then(appliedStyles => appliedStyles.filter(_.identity))
    .then(appliedStyles => {
      const styleCount = appliedStyles.length;
      if (styleCount > 0) {
        setBrowserActionToStyleApplied({ tabId, styleCount });
      } else {
        // TODO: see if this is too aggro
        setBrowserActionToDefault({ tabId });
      }
    });
});

chrome.tabs.onRemoved.addListener(tabId => {
  if (TAB_IDS_TO_APPLY_STYLES[tabId]) {
    stopMonitoringTabID(tabId);
  }
});

devtoolConnection = messenger.initConnection(
  PORT_TYPES.devtool_widget,
  handleDevtoolMessages
);

gistConnection = messenger.initConnection(
  PORT_TYPES.github_gist,
  handleGistContentScriptMessages
);
