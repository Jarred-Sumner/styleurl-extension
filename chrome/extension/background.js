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
import Raven from "raven-js";

Raven.config(
  "https://26483721d124446bb37ebe913d3b8347@sentry.io/1246693"
).install();

Raven.context(function() {
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
  const TAB_IDS_STYLESHEET_DIFFS = {};
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
    const { kind = null } = request;

    const kinds = MESSAGE_TYPES;

    if (!kind) {
      return;
    }

    if (!_.values(kinds).includes(kind)) {
      console.error(
        "[background] request kind must be one of",
        _.values(kinds)
      );
      return;
    }

    if (kind === kinds.get_gist_content) {
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

  const autodetectStyleURL = async ({ url, tabId }) => {
    const gistId = getGistIDFromURL(url);

    if (!gistId) {
      log("Gist ID not found");
      return;
    }

    await startMonitoringTabID({ tabId, gistId });
  };

  const handleInlineHeaderMessages = async (
    request,
    from,
    sender,
    sendResponse
  ) => {
    const { kind = null } = request;
    const kinds = MESSAGE_TYPES;

    if (!kind) {
      return;
    }

    if (!_.values(kinds).includes(kind)) {
      console.error(
        "[background] request kind must be one of",
        _.values(kinds)
      );
      return;
    }

    const tabId = getTabId(from);
    const tab = await getTab(tabId);

    if (kind === kinds.log) {
    } else if (kind === kinds.get_current_styles_diff) {
      getCurrentStylesheetsDiff(tabId).then(response => sendResponse(response));
    } else if (kind === kinds.send_success_notification) {
      chrome.notifications.create({
        kind: "basic",
        iconUrl: chrome.extension.getURL(DEFAULT_ICON_PATH["128"]),
        title: !request.value.didCopy
          ? `Created styleurl`
          : "Copied your styleurl to clipboard",
        message:
          "Your CSS changes have been exported to a styleurl successfully. Now you can share it!"
      });
    } else if (kind === kinds.get_styleurl) {
      const styleURL = _.first(styleURLsForTabId(tabId));
      sendResponse(styleURL);
    } else if (kind === kinds.update_styleurl_state) {
      const styleURL = _.first(styleURLsForTabId(tabId));
      const {
        isBarEnabled = styleURL.isBarEnabled,
        isStyleEnabled = styleURL.isStyleEnabled
      } = request.value;

      if (isBarEnabled !== styleURL.isBarEnabled) {
        styleURL.isBarEnabled = isBarEnabled;
      }

      if (isStyleEnabled !== styleURL.isStyleEnabled) {
        styleURL.isStyleEnabled = isStyleEnabled;
        chrome.tabs.reload(tabId);
      }

      sendResponse(styleURL);
    } else if (kind === kinds.shared_styleurl) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.extension.getURL(DEFAULT_ICON_PATH["128"]),
        title: "Copied styleurl to clipboard",
        message: "Share the styleurl by pasting it to a friend or colleague"
      });
    } else if (kind === kinds.upload_stylesheets) {
      uploadStylesheets({
        stylesheets: request.value.stylesheets,
        url: tab.url,
        visibility: request.value.visibility
      }).then(stylesheetResponse => {
        sendResponse(stylesheetResponse);

        if (stylesheetResponse.success) {
          chrome.tabs.captureVisibleTab(null, { format: "png" }, async function(
            photo
          ) {
            window.setTimeout(async () => {
              chrome.tabs.create({ url: stylesheetResponse.data.url }, tab => {
                autodetectStyleURL({ tabId: tab.id, url: tab.url });
              });
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

  const handleDevtoolMessages = async (request, from, sender, sendResponse) => {
    const { kind = null } = request;
    const kinds = MESSAGE_TYPES;

    if (!kind) {
      return;
    }

    if (!_.values(kinds).includes(kind)) {
      console.error(
        "[background] request kind must be one of",
        _.values(kinds)
      );
      return;
    }

    const tabId = getTabId(from);
    const tab = await getTab(tabId);

    if (kind === kinds.log) {
      console.log.apply(console, request.value);
    } else if (kind === kinds.send_content_stylesheets) {
      log("Received content stylesheets", request.value);
      if (!TAB_ORIGINAL_STYLES[tabId]) {
        TAB_ORIGINAL_STYLES[tabId] = request.value;
        LAST_RECEIVED_TAB_ORIGINAL_STYLES[tabId] = new Date().getTime();
      } else {
        const contentStyles = request.value;
        const existingSheets = TAB_ORIGINAL_STYLES[tabId];
        contentStyles.forEach(style => {
          ƒ;
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
      kind === kinds.style_diff_changed &&
      shouldAssumeChangesAreReal(tabId) &&
      !styleURLsForTabId(tabId)
    ) {
      injectCreateStyleURLBar(tabId);
    }
  };

  const getCurrentStylesheetsDiff = tabId => {
    return devtoolConnection
      .sendMessage(`devtool:${PORT_TYPES.devtool_widget}:${tabId}`, {
        kind: MESSAGE_TYPES.get_current_styles_diff
      })
      .then(
        response => {
          log("Received styles!");
          let modifiedSheets = response.value.stylesheets.slice();
          const currentStyles = response.value.general_stylesheets;
          const oldStyles = TAB_ORIGINAL_STYLES[tabId];
          if (oldStyles) {
            oldStyles.forEach(oldStyle => {
              const newStyle = currentStyles.find(
                style => style.url === oldStyle.url
              );
              if (newStyle.content) {
                const diffedStyle = diffSheet(
                  oldStyle.content || "",
                  newStyle.content || ""
                );
                if (diffedStyle && diffedStyle.trim().length > 0) {
                  modifiedSheets.push({
                    url: oldStyle.url,
                    content: diffedStyle
                  });
                }
              }
            });
          }

          TAB_IDS_STYLESHEET_DIFFS[tabId] = modifiedSheets;

          return {
            stylesheets: modifiedSheets
          };
        },
        err => {
          console.error(err);
          alert("Something went wrong. Please try again");
        }
      );
  };

  chrome.browserAction.onClicked.addListener(tab => {
    console.log("Clicked Browser Action", getBrowserActionState());
    if (getBrowserActionState() === BROWSER_ACTION_STATES.default) {
      injectCreateStyleURLBar(tab.id);
    } else if (getBrowserActionState() === BROWSER_ACTION_STATES.upload_style) {
      injectCreateStyleURLBar(tab.id);
    } else if (
      getBrowserActionState() === BROWSER_ACTION_STATES.style_applied
    ) {
      injectViewStyleURLBar(tab.id);
    }
  });

  chrome.webNavigation.onBeforeNavigate.addListener(
    ({ tabId, url }) => {
      autodetectStyleURL({ tabId, url });
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
});
