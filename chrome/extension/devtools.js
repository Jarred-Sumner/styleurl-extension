import _ from "lodash";
import { portName, MESSAGE_TYPES, PORT_TYPES } from "./lib/port";
import Messenger from "chrome-ext-messenger";

const messenger = new Messenger();

let connection;

let styleManagerOpened = false;

const log = (...messages) => {
  connection.sendMessage(`background:${PORT_TYPES.devtool_widget}`, {
    kind: MESSAGE_TYPES.log,
    value: ["[DEVTOOLS]", ...messages]
  });
};

const isResourceStyle = resource => resource && resource.type === "stylesheet";

const isInspectorStyle = resource => {
  const isStylesheet =
    resource.url.startsWith("inspector://") && isResourceStyle(resource);
  return isStylesheet;
};

const isGeneralStyle = resource => {
  const isStylesheet =
    resource.url.startsWith("inspector://") === false &&
    isResourceStyle(resource);
  return isStylesheet;
};

const getResources = () =>
  new Promise((resolve, reject) =>
    chrome.devtools.inspectedWindow.getResources(resources => {
      resolve(resources);
    })
  );

const getResourceContent = resource =>
  new Promise((resolve, reject) => {
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
    .then(stylesheets => Promise.all(stylesheets.map(getResourceContent)))
    .catch(error => alert(error));
};

const getGeneralStyles = () =>
  new Promise((resolve, reject) => {
    Promise.all([getStyleTags(), getLoadedSheets()]).then(allStyles => {
      const filteredStyles = _
        .compact(_.flatten(allStyles))
        .filter(o => !_.isEmpty(o));

      return resolve(filteredStyles);
    });
  });

const getInspectorStyles = () => {
  return getResources()
    .then(resources => resources.filter(isInspectorStyle))
    .then(stylesheets => Promise.all(stylesheets.map(getResourceContent)))
    .catch(error => alert(error));
};

const createConnection = () => {
  return messenger.initConnection(
    PORT_TYPES.devtool_widget,
    handleReceivedMessage
  );
};

const handleReceivedMessage = (request, from, sender, sendResponse) => {
  if (request.kind === MESSAGE_TYPES.get_current_styles_diff) {
    Promise.all([getInspectorStyles(), getGeneralStyles()]).then(promises => {
      sendResponse({
        kind: MESSAGE_TYPES.get_current_styles_diff,
        response: true,
        value: {
          ...request.value,
          stylesheets: promises[0],
          general_stylesheets: promises[1]
        }
      });
    });
  }
};

const sendStyleDiffChangedEvent = el => {
  if (isResourceStyle(el)) {
    getInspectorStyles().then(stylesheets => {
      if (!connection) {
        return;
      }

      connection.sendMessage(`background:${PORT_TYPES.devtool_widget}`, {
        kind: MESSAGE_TYPES.style_diff_changed,
        value: {
          stylesheets
        }
      });
    });
  }
};

const sendContentStyles = () => {
  return new Promise(resolve => {
    getGeneralStyles().then(stylesheets => {
      if (!connection) {
        return;
      }

      connection.sendMessage(`background:${PORT_TYPES.devtool_widget}`, {
        kind: MESSAGE_TYPES.send_content_stylesheets,
        value: stylesheets
      });
      resolve();
    });
  });
};

const setupConnection = () => {
  connection = createConnection();
  sendContentStyles();
  sendStyleDiffChangedEvent();
};

chrome.devtools.network.onNavigated.addListener(function() {
  if (connection) {
    connection.disconnect();
  }

  if (_.isNumber(chrome.devtools.inspectedWindow.tabId)) {
    setupConnection();
  }
});

chrome.devtools.inspectedWindow.onResourceContentCommitted.addListener(
  sendStyleDiffChangedEvent
);

chrome.devtools.inspectedWindow.onResourceAdded.addListener(
  sendStyleDiffChangedEvent
);

chrome.devtools.inspectedWindow.onResourceContentCommitted.addListener(
  resource => {
    if (resource.url.startsWith("debugger://")) {
      return;
    }
    sendContentStyles(resource).then(() => {
      if (styleManagerOpened === false) {
        styleManagerOpened = true;
        connection.sendMessage(`background:${PORT_TYPES.devtool_widget}`, {
          kind: MESSAGE_TYPES.open_style_editor
        });
      }

      connection.sendMessage(
        `content_script:${PORT_TYPES.inline_header}:${
          chrome.devtools.inspectedWindow.tabId
        }`,
        { kind: MESSAGE_TYPES.style_diff_changed }
      );

      connection.sendMessage(`background:${PORT_TYPES.devtool_widget}`, {
        kind: MESSAGE_TYPES.style_diff_changed
      });
    });
  }
);
setupConnection();

chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
  chrome.devtools.inspectedWindow.eval("window.__styleurlSetSelected($0)", {
    useContentScriptContext: true
  });
});
