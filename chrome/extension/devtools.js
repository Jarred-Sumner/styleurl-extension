import _ from "lodash";
import { portName, MESSAGE_TYPES } from "./lib/port";
import Bluebird from "bluebird";

window.Promise = Bluebird;

let port;

const log = (...messages) => {
  console.log.call(this, messages);
};

const isResourceStylesheet = resource => {
  // TODO: make it work with non-inspector stylesheets
  return (
    resource.url.startsWith("inspector://") && resource.type === "stylesheet"
  );
};

const getResources = () =>
  new Promise(resolve =>
    chrome.devtools.inspectedWindow.getResources(resources => {
      resolve(resources);
    })
  );

const getStyles = () => {
  log("[devtools] Get styles");
  return getResources().then(resources => {
    return Promise.map(resources.filter(isResourceStylesheet), resource => {
      return new Promise((resolveContent, reject) => {
        resource.getContent(content => {
          resolveContent({
            url: resource.url,
            content
          });
        });
      });
    });
  });
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
      port.postMessage({
        type: MESSAGE_TYPES.get_styles_diff,
        tabId: chrome.devtools.inspectedWindow.tabId,
        response: true,
        value: {
          stylesheets
        }
      });

      return true;
    });
  }

  return true;
};

const setupPort = () => {
  if (port) {
    port.disconnect();
  }

  port = createPort();

  port.onMessage.addListener(handleReceivedMessage);
};

chrome.devtools.network.onNavigated.addListener(function() {
  setupPort();
});

chrome.runtime.onMessage.addListener(handleReceivedMessage);

setupPort();
