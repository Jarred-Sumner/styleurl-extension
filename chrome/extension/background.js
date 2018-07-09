import { portName, MESSAGE_TYPES } from "./lib/port";
import _ from "lodash";
const bluebird = require("bluebird");

global.Promise = bluebird;

const buildURL = path => {
  `http://localhost:3001${path}`;
};

const fetch = (path, options = {}) => {
  return window.fetch(buildURL(path), {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      "User-Agent": `StyleURL v${chrome.app.getDetails().version} (${
        process.env.NODE_ENV
      })`,
      "Content-Type": "application/json"
    }
  });
};

const uploadStylesheets = ({ stylesheets, url }) => {
  return fetch("/api/stylesheet_groups", {
    method: "POST",
    body: JSON.stringify({
      url,
      stylesheets
    })
  });
};

function promisifier(method) {
  // return a function
  return function promisified(...args) {
    // which returns a promise
    return new Promise(resolve => {
      args.push(resolve);
      method.apply(this, args);
    });
  };
}

function promisifyAll(obj, list) {
  list.forEach(api => bluebird.promisifyAll(obj[api], { promisifier }));
}

const handleMessage = async request => {
  if (!request.type) {
    console.error(
      "[background] request type must be one of",
      _.values(MESSAGE_TYPES)
    );
    return;
  }

  if (!request.response) {
    console.info("[background] ignoring request that is not a response");
  }

  if (request.type === MESSAGE_TYPES.get_styles_diff) {
    console.log("[background] REceived styles!");
    const tab = await chrome.tabs.get(request.tabId);

    if (!tab || !tab.url) {
      alert("Something didnt work quite right. Please try again!");
      return;
    }

    const stylesheetResponse = await uploadStylesheets({
      stylesheets: request.value.stylesheets,
      url: tab.url
    }).then(response => response.json());

    if (stylesheetResponse.success) {
      chrome.tabs.create({ url: stylesheetResponse.data.url });
    } else {
      alert("Something didnt work quite right. Please try again!");
    }
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
