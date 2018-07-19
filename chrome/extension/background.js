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
  BROWSER_ACTION_STATES,
  DEFAULT_ICON_PATH
} from "./lib/browserAction";
import {
  injectCreateStyleURLBar,
  injectViewStyleURLBar
} from "./background/inject";
import {
  StyleURLTab,
  styleURLsForTabId,
  stopMonitoringTabID,
  startMonitoringTabID
} from "./lib/StyleURLTab";

global.Promise = Bluebird;

let devtoolConnection;
let gistConnection;
let inlineHeaderConnection;
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
const LAST_RECEIVED_TAB_ORIGINAL_STYLES = {};

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

const shouldAssumeChangesAreReal = tabId => {
  return (
    LAST_RECEIVED_TAB_ORIGINAL_STYLES[tabId] &&
    new Date().getTime() - LAST_RECEIVED_TAB_ORIGINAL_STYLES[tabId] > 5000
  );
};

const handleInlineHeaderMessages = async (
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

  const tabId = getTabId(from);
  const tab = await getTab(tabId);

  if (type === types.log) {
  } else if (type === types.create_style_url) {
    createStyleURL(tab, request.value.visibility).then(response =>
      sendResponse(response)
    );
  } else if (type === types.send_success_notification) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.extension.getURL(DEFAULT_ICON_PATH["128"]),
      title: !request.value.didCopy
        ? `Created styleurl`
        : "Copied your styleurl to clipboard",
      message:
        "Your CSS changes have been exported to a styleurl successfully. Now you can share it!"
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
      LAST_RECEIVED_TAB_ORIGINAL_STYLES[tabId] = new Date().getTime();
    } else {
      const contentStyles = request.value;
      const existingSheets = TAB_ORIGINAL_STYLES[tabId];
      contentStyles.forEach(style => {
        const index = _.findIndex(
          existingSheets,
          sheet => sheet.url === style.url
        );
        if (index === -1) {
          TAB_ORIGINAL_STYLES[tabId].push(style);
          LAST_RECEIVED_TAB_ORIGINAL_STYLES[tabId] = new Date().getTime();
        }
      });
    }
  } else if (
    type === types.style_diff_changed &&
    shouldAssumeChangesAreReal(tabId)
  ) {
    injectCreateStyleURLBar(tabId);
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
      url: tab.url,
      visibility: request.value.visibility
    }).then(stylesheetResponse => {
      sendResponse(stylesheetResponse);

      if (stylesheetResponse.success) {
        chrome.tabs.captureVisibleTab(null, { format: "png" }, async function(
          photo
        ) {
          window.setTimeout(async () => {
            chrome.tabs.create({ url: stylesheetResponse.data.url });
            // Capturing the photo fails sometimes shrug
            if (photo) {
              uploadScreenshot({
                photo: await toFile(photo, SCREENSHOT_CONTENT_TYPE),
                key: stylesheetResponse.data.id,
                domain: stylesheetResponse.data.domain
              });
            }
          }, 50);
        });
      } else {
        alert("Something didnt work quite right. Please try again!");
      }
    });
  }
};

const createStyleURL = (tab, visibility) => {
  return devtoolConnection.sendMessage(
    `devtool:${PORT_TYPES.devtool_widget}:${tab.id}`,
    { type: MESSAGE_TYPES.get_styles_diff, value: { visibility } }
  );
};

chrome.browserAction.onClicked.addListener(tab => {
  console.log("Clicked Browser Action", getBrowserActionState());
  if (getBrowserActionState() === BROWSER_ACTION_STATES.default) {
    injectCreateStyleURLBar(tab.id);
  } else if (getBrowserActionState() === BROWSER_ACTION_STATES.upload_style) {
    injectCreateStyleURLBar(tab.id);
  } else if (getBrowserActionState() === BROWSER_ACTION_STATES.style_applied) {
    injectViewStyleURLBar(tab.id);
  }
});

chrome.webNavigation.onBeforeNavigate.addListener(
  async ({ tabId, url }) => {
    const gistId = getGistIDFromURL(url);

    if (!gistId) {
      log("Gist ID not found");
      return;
    }

    await startMonitoringTabID({ tabId, gistId });
  },
  {
    url: Object.values(SPECIAL_QUERY_PARAMS).map(queryContains => ({
      queryContains
    }))
  }
);

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.url) {
    return;
  }

  if (changeInfo.status !== "loading") {
    return;
  }

  const styleURLs = styleURLsForTabId(tabId);
  if (!styleURLs) {
    return;
  }

  // Handle case where we haven't loaded the styleurl gist yet
  const pendingStyleURLs = styleURLs.filter(({ loaded = false }) => !loaded);
  if (pendingStyleURLs) {
    await Promise.all(
      pendingStyleURLs.map(styleurl => styleurl.load(styleurl.gistId))
    );
  }

  const appliedStyles = styleURLs.filter(styleURLTab =>
    styleURLTab.applyToTab(tab)
  );

  if (styleURLs.find(({ isBarEnabled }) => isBarEnabled)) {
    injectViewStyleURLBar(tabId);
  }

  const styleCount = appliedStyles.length;
  if (styleCount > 0) {
    setBrowserActionToStyleApplied({ tabId, styleCount });
  } else {
    // TODO: see if this is too aggro
    setBrowserActionToDefault({ tabId });
  }
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

inlineHeaderConnection = messenger.initConnection(
  PORT_TYPES.inline_header,
  handleInlineHeaderMessages
);
