import _ from "lodash";
import { portName, MESSAGE_TYPES } from "./lib/port";
import Bluebird from "bluebird";

let port;

const log = (...messages) => {
  // alert(JSON.stringify(messages));
};

const isResourceStylesheet = resource => {
  const isStylesheet =
    resource.url.startsWith("inspector://") && resource.type === "stylesheet";
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

const getStyles = () => {
  log("[devtools] Get styles");
  return getResources()
    .then(resources => resources.filter(isResourceStylesheet))
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
    return getStyles().then(styles => {
      log("SENDING", styles.length, "styles");
      port.postMessage({
        type: MESSAGE_TYPES.get_styles_diff,
        tabId: chrome.devtools.inspectedWindow.tabId,
        response: true,
        value: {
          stylesheets: styles
        }
      });

      return true;
    });
  }

  return true;
};

const setupPort = () => {
  port = createPort();
  port.onMessage.addListener(handleReceivedMessage);
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

setupPort();
