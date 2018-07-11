import _ from "lodash";
import S3Upload from "react-s3-uploader/s3upload";
import {
  applyStyleURLToTabID,
  getGistById,
  getGistIDFromURL,
  loadStylefileFromGist,
  SPECIAL_QUERY_PARAMS
} from "./lib/gists";
import { MESSAGE_TYPES, portName } from "./lib/port";
import { shouldApplyStyleToURL } from "./lib/stylefile";
const bluebird = require("bluebird");

const log = (...messages) =>
  console.log.apply(console, ["[Background]", ...messages]);

const SCREENSHOT_CONTENT_TYPE = "image/png";

const TAB_IDS_TO_APPLY_STYLES = {};

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

global.Promise = bluebird;

const buildURL = path => {
  return `http://localhost:3001${path}`;
};

const toBlob = base64String => {
  return window.fetch(base64String).then(res => res.blob());
};

const toFile = async base64String => {
  const blob = await toBlob(base64String);

  Object.defineProperty(blob, "name", {
    get: function() {
      return "photo.png";
    }
  });

  Object.defineProperty(blob, "type", {
    get: function() {
      return SCREENSHOT_CONTENT_TYPE;
    }
  });

  return blob;
};

const uploaders = {};

const apiFetch = (path, options = {}) => {
  return window
    .fetch(buildURL(path), {
      ...options,
      credentials: "include",
      headers: {
        ...(options.headers || {}),
        "User-Agent": `StyleURL v${chrome.app.getDetails().version} (${
          process.env.NODE_ENV
        })`,
        "Content-Type": "application/json"
      }
    })
    .then(response => response.json())
    .catch(error => {
      console.error(error);
      return {
        success: false
      };
    });
};

const uploadStylesheets = async ({ stylesheets, url }) => {
  return apiFetch("/api/stylesheet_groups", {
    method: "POST",
    body: JSON.stringify({
      url,
      stylesheets
    })
  });
};

const processScreenshot = ({
  key: stylesheet_key,
  domain: stylesheet_domain
}) => ({ publicUrl: url }) => {
  return apiFetch("/api/photos/process", {
    method: "POST",
    body: JSON.stringify({
      url,
      stylesheet_key,
      stylesheet_domain,
      content_type: SCREENSHOT_CONTENT_TYPE
    })
  }).then(() => {
    delete uploaders[stylesheet_key];
  });
};

const uploadScreenshot = ({ key, domain, photo }) => {
  uploaders[key] = new S3Upload({
    files: [photo],
    signingUrl: "/api/photos/presign",
    onFinishS3Put: processScreenshot({ key, domain }),
    onError: error => {
      console.error(error);
      delete uploaders[key];
    },
    server: "http://localhost:3001",
    uploadRequestHeaders: {}
  });
};

const getTab = tabId =>
  new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, resolve);
  });

const handleMessage = (request, sender, sendResponse) => {
  if (!request.type) {
    console.error(
      "[background] request type must be one of",
      _.values(MESSAGE_TYPES)
    );
    return;
  }

  if (request.type === MESSAGE_TYPES.get_gist_content) {
    if (!request.url) {
      console.error("[background] invalid get_gist_content: missing url");
      sendResponse({ success: false });
      return true;
    }

    window
      .fetch(request.url, {
        redirect: "follow",
        credentials: "include"
      })
      .then(response => response.text())
      .then(content => {
        sendResponse({
          type: MESSAGE_TYPES.get_gist_content,
          url: request.url,
          response: true,
          content
        });
      });

    return true;
  }

  if (!request.response) {
    console.info("[background] ignoring request that is not a response");
  }

  if (request.type === MESSAGE_TYPES.get_styles_diff) {
    console.log("[background] REceived styles!");

    getTab(request.tabId)
      .then(tab => {
        if (!tab || !tab.url) {
          alert("Something didnt work quite right. Please try again!");
          return Promise.reject();
        }

        return uploadStylesheets({
          stylesheets: request.value.stylesheets,
          url: tab.url
        });
      })
      .then(stylesheetResponse => {
        if (stylesheetResponse.success) {
          chrome.tabs.captureVisibleTab(null, { format: "png" }, async function(
            photo
          ) {
            chrome.tabs.create({ url: stylesheetResponse.data.url });
            // Capturing the photo fails sometimes shrug
            if (photo) {
              uploadScreenshot({
                photo: await toFile(photo),
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

const ports = {};

chrome.runtime.onConnect.addListener(function(port) {
  ports[port.name] = port;

  console.log("NEW PORT", port.name);
  port.onMessage.addListener(handleMessage);
});

const createStyleURL = tab => {
  const port = ports[portName(tab.id)];

  if (!port) {
    alert("Please open devtools and try again");
    return;
  }

  port.postMessage({ type: MESSAGE_TYPES.get_styles_diff }, handleMessage);
};

chrome.browserAction.onClicked.addListener(createStyleURL);
chrome.runtime.onMessage.addListener(handleMessage);

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

  TAB_IDS_TO_APPLY_STYLES[tabId].forEach(async gistId => {
    const gist = await getGistById(gistId);
    const stylefile = loadStylefileFromGist(gist);

    if (!stylefile) {
      return;
    }

    if (!shouldApplyStyleToURL(stylefile, tab.url)) {
      return;
    }

    applyStyleURLToTabID(gist, tabId);
  });
});

chrome.tabs.onRemoved.addListener(tabId => {
  if (TAB_IDS_TO_APPLY_STYLES[tabId]) {
    stopMonitoringTabID(tabId);
  }
});
