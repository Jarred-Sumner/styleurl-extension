import _ from "lodash";
import { portName, MESSAGE_TYPES } from "./lib/port";
import Bluebird from "bluebird";

let port;

const log = (...messages) => {
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.log,
    value: ["[DEVTOOLS]", ...messages]
  });
};

const isInspectorStyle = resource => {
  const isStylesheet =
    resource.url.startsWith("inspector://") && resource.type === "stylesheet";
  return isStylesheet;
};

const isGeneralStyle = resource => {
  const isStylesheet =
    resource.url.startsWith("inspector://") === false &&
    resource.type === "stylesheet";
  return isStylesheet;
};

const getResources = () =>
  new Bluebird((resolve, reject) =>
    chrome.devtools.inspectedWindow.getResources(resources => {
      resolve(resources);
    })
  );

const getResourceContent = resource =>
  new Bluebird((resolve, reject) => {
    log("GET", resource.url);
    resource.getContent(content => {
      resolve({
        url: resource.url,
        content
      });
    });
  });

// Warning --
// This gets called in browser context, do not use es modules here
const getStyleTagsInBrowser = () => {
  const __extractedStyles = document.styleSheets;
  const styles = {};
  Object.keys(__extractedStyles).map(ind => {
    const ss = __extractedStyles[ind];
    let sturl;
    if (typeof ss.href === "string") {
      return null; // Don't extract non style tags
    }
    if (ss.ownerNode) {
      if (ss.ownerNode.id.length === 0) {
        ss.ownerNode.dataset.styleurl_id = "style" + ind;
      } else {
        ss.ownerNode.dataset.styleurl_id = ss.ownerNode.id;
      }
      sturl = ss.ownerNode.dataset.styleurl_id;
    }
    const content = Object.keys(ss.cssRules)
      .map(sind => ss.cssRules[sind].cssText)
      .join("\n");
    if (!sturl) {
      return null;
    }
    styles[sturl] = content;
  });
  return styles;
};

const getStyleTags = () =>
  new Promise(resolve => {
    chrome.tabs.executeScript(
      chrome.devtools.inspectedWindow.tabId,
      {
        code: `((${getStyleTagsInBrowser.toString()})())`
      },
      ds => {
        const styleTags = ds[0];

        resolve(
          _.keys(styleTags).map(key => {
            return { url: key, content: styleTags[key] };
          })
        );
      }
    );
  });

const getLoadedSheets = () => {
  return getResources()
    .then(resources => resources.filter(isGeneralStyle))
    .then(stylesheets => Bluebird.all(stylesheets.map(getResourceContent)))
    .catch(error => alert(error));
};

const getGeneralStyles = () =>
  new Bluebird((resolve, reject) => {
    Bluebird.all([getStyleTags(), getLoadedSheets()]).then(allStyles => {
      const filteredStyles = _
        .compact(_.flatten(allStyles))
        .filter(o => !_.isEmpty(o));

      return resolve(filteredStyles);
    });
  });

const getInspectorStyles = () => {
  return getResources()
    .then(resources => resources.filter(isInspectorStyle))
    .then(stylesheets => Bluebird.all(stylesheets.map(getResourceContent)))
    .catch(error => alert(error));
};

const createPort = () => {
  return chrome.runtime.connect({
    name: portName(chrome.devtools.inspectedWindow.tabId)
  });
};

const handleReceivedMessage = (request, sender, sendResponse) => {
  log("Message", request);
  if (!request.type) {
    log("request type must be one of", _.values(MESSAGE_TYPES));
    return;
  }

  if (request.type === MESSAGE_TYPES.get_styles_diff) {
    return Promise.all([getInspectorStyles(), getGeneralStyles()]).then(
      promises => {
        port.postMessage({
          type: MESSAGE_TYPES.get_styles_diff,
          tabId: chrome.devtools.inspectedWindow.tabId,
          response: true,
          value: {
            stylesheets: promises[0],
            general_stylesheets: promises[1]
          }
        });

        return true;
      }
    );
  }

  return true;
};

const sendStyleDiffChangedEvent = el => {
  if (!el || isInspectorStyle(el)) {
    getInspectorStyles().then(stylesheets => {
      if (!port || _.isEmpty(stylesheets)) {
        return;
      }

      port.postMessage({
        type: MESSAGE_TYPES.style_diff_changed,
        tabId: chrome.devtools.inspectedWindow.tabId,
        response: false,
        value: {
          stylesheets
        }
      });
    });
  }
};

const sendContentStyles = () => {
  getGeneralStyles().then(stylesheets => {
    if (!port) {
      return;
    }

    port.postMessage({
      type: MESSAGE_TYPES.send_content_stylesheets,
      tabId: chrome.devtools.inspectedWindow.tabId,
      response: false,
      value: stylesheets
    });
  });
};

const setupPort = () => {
  port = createPort();
  sendStyleDiffChangedEvent();
  port.onMessage.addListener(handleReceivedMessage);
  sendContentStyles();
};

chrome.devtools.network.onNavigated.addListener(function() {
  if (port) {
    port.disconnect();
  }

  if (_.isNumber(chrome.devtools.inspectedWindow.tabId)) {
    setupPort();
  }
});

chrome.runtime.onMessage.addListener(handleReceivedMessage);
chrome.devtools.inspectedWindow.onResourceContentCommitted.addListener(
  sendStyleDiffChangedEvent
);

chrome.devtools.inspectedWindow.onResourceAdded.addListener(
  sendStyleDiffChangedEvent
);

// chrome.devtools.inspectedWindow.onResourceAdded.addListener(sendContentStyles);
// above causes inf loop, not sure why

setupPort();
