import Messenger from "chrome-ext-messenger";
import Hashes from "jshashes";
import _ from "lodash";
import { MESSAGE_TYPES, PORT_TYPES } from "./lib/port";
const messenger = new Messenger();
const SHA256 = new Hashes.SHA256();

let connection;

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

const getResourceUrl = resource => {
  let resourceUrl = resource.url;
  if (resourceUrl.startsWith("data:")) {
    resourceUrl = `datauri-${SHA256.hex(resourceUrl)}` + ".css";
  }
  return resourceUrl;
};

const getResourceContent = resource =>
  new Promise((resolve, reject) => {
    const resourceUrl = getResourceUrl(resource);
    log("GET", resourceUrl);
    resource.getContent(content => {
      resolve({
        url: resourceUrl,
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
    // ignore:
    // - non-style tags
    // - empty style tags (those are not editable from devtools)
    if (
      typeof ss.href === "string" ||
      !ss.ownerNode ||
      ss.ownerNode.innerHTML.length === 0
    ) {
      return null;
    }

    const id = `styletag_${ind}`;

    ss.ownerNode.dataset.styleurl_id = id;
    const content = Object.keys(ss.cssRules)
      .map(sind => ss.cssRules[sind].cssText)
      .join("\n");

    styles[id] = content;
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
        .map(({ content, url }) => ({ url, content: content }));
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

const sendSelectedElementToContentScript = () => {
  chrome.devtools.inspectedWindow.eval(
    ` window.__styleurlSelectedElement = $0;
      window.__styleurlSetSelected && window.__styleurlSetSelected($0);`,
    {
      useContentScriptContext: true
    }
  );
};

const setupConnection = () => {
  connection = createConnection();

  sendContentStyles();
  sendStyleDiffChangedEvent();
  sendSelectedElementToContentScript();
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

const contentStyleListener = resource => {
  if (resource.url.startsWith("debugger://")) {
    return;
  }
  sendContentStyles(resource).then(() => {
    connection.sendMessage(`background:${PORT_TYPES.devtool_widget}`, {
      kind: MESSAGE_TYPES.open_style_editor
    });

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
};

chrome.devtools.inspectedWindow.onResourceContentCommitted.addListener(
  _.debounce(contentStyleListener, 150)
);
setupConnection();

chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
  sendSelectedElementToContentScript();
});
