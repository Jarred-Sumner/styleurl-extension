import _ from "lodash";
import { portName, MESSAGE_TYPES } from "./lib/port";
import Bluebird from "bluebird";

let port;

const log = (...messages) => {
  // alert(JSON.stringify(messages));
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

const getInspectorStyles = () => {
  log("[devtools] Get inspector styles");
  return getResources()
    .then(resources => resources.filter(isInspectorStyle))
    .then(stylesheets => Bluebird.all(stylesheets.map(getResourceContent)))
    .catch(error => alert(error));
};

const getGeneralStyles = () => {
  log("[devtools] Get general styles");
  return getResources()
    .then(resources => resources.filter(isGeneralStyle))
    .then(stylesheets => Bluebird.all(stylesheets.map(getResourceContent)))
    .catch(error => alert(error));
};

const createPort = () => {
  return chrome.runtime.connect({
    name: portName(chrome.devtools.inspectedWindow.tabId)
  });
};

const handleReceivedMessage = (request, sender, sendResponse) => {
  log("[devtools] Message", request);
  if (!request.type) {
    log("request type must be one of", _.values(MESSAGE_TYPES));
    return;
  }

  if (request.type === MESSAGE_TYPES.get_styles_diff) {
    return Promise.all([getInspectorStyles(), getGeneralStyles()]).then(
      promises => {
        const styles = {};

        promises[1].map(ss => {
          styles[ss.url] = ss.content;
        });
        port.postMessage({
          type: MESSAGE_TYPES.get_styles_diff,
          tabId: chrome.devtools.inspectedWindow.tabId,
          response: true,
          value: {
            stylesheets: promises[0],
            general_stylesheets: styles
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
      if (!port) {
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

const sendContentStyles = el => {
  if (!el || isInspectorStyle(el)) {
    getGeneralStyles().then(stylesheets => {
      if (!port) {
        return;
      }

      const styles = {};

      stylesheets.map(ss => {
        styles[ss.url] = ss.content;
      });

      port.postMessage({
        type: MESSAGE_TYPES.send_content_stylesheets,
        tabId: chrome.devtools.inspectedWindow.tabId,
        response: false,
        value: styles
      });
    });
  }
};

const sendModifiedScriptUpdate = el => {
  if (el)
    return port.postMessage({
      typ
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

chrome.devtools.inspectedWindow.onResourceAdded.addListener(sendContentStyles);

setupPort();
