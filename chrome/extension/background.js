import Messenger from "chrome-ext-messenger";
import _ from "lodash";
import memoizee from "memoizee";
import Raven from "raven-js";
import _diffSheet from "stylesheet-differ";
import {
  injectCreateStyleURLBar,
  injectCSSManager,
  injectViewStyleURLBar
} from "./background/inject";
import {
  SCREENSHOT_CONTENT_TYPE,
  uploadScreenshot,
  uploadStylesheets,
  sendFeedback
} from "./lib/api";
import {
  BROWSER_ACTION_STATES,
  DEFAULT_ICON_PATH,
  getBrowserActionState,
  setBrowserActionToDefault,
  setBrowserActionToStyleApplied
} from "./lib/browserAction";
import { getGistIDFromURL, SPECIAL_QUERY_PARAMS } from "./lib/gists";
import injectScriptNames from "./lib/injectScriptNames";
import { MESSAGE_TYPES, PORT_TYPES } from "./lib/port";
import {
  startMonitoringTabID,
  stopMonitoringTabID as _stopMonitoringTabID,
  styleURLsForTabId
} from "./lib/StyleURLTab";
import { toFile } from "./lib/toFile";

const diffSheet = memoizee(_diffSheet, {
  maxAge: 300000, // 5 minutes,
  primitive: true
});

Raven.config(
  "https://26483721d124446bb37ebe913d3b8347@sentry.io/1246693"
).install();

Raven.setExtraContext({
  version: chrome.runtime.getManifest().version,
  environment: process.env.NODE_ENV
});

Raven.context(function() {
  let DEVTOOLS_OPEN_TABS = {};
  let devtoolConnection;
  let gistConnection;
  let stylesheetManagerConnection;
  let inlineStyleObserverConnection;
  let inlineHeaderConnection;
  const messenger = new Messenger();

  messenger.initBackgroundHub({
    connectedHandler: function(extensionPart, connectionName, tabId) {
      if (extensionPart === "devtool") {
        DEVTOOLS_OPEN_TABS[tabId] = true;
      }
    },
    disconnectedHandler: function(extensionPart, connectionName, tabId) {
      if (
        extensionPart === "devtool" &&
        getBrowserActionState() === BROWSER_ACTION_STATES.upload_style
      ) {
        setBrowserActionToDefault({ tabId });
      }

      if (extensionPart === "devtool") {
        DEVTOOLS_OPEN_TABS[tabId] = false;
      }

      if (
        extensionPart === "devtool" &&
        tabId &&
        !styleURLsForTabId(tabId).length
      ) {
        inlineStyleObserverConnection.sendMessage(
          `content_script:${PORT_TYPES.inline_style_observer}:${tabId}`,
          {
            kind: MESSAGE_TYPES.stop_observing_inline_styles
          }
        );
      }
    }
  });

  const log = (...messages) =>
    console.log.apply(console, ["[Background]", ...messages]);

  const TAB_IDS_TO_APPLY_STYLES = {};
  const TAB_IDS_STYLESHEET_DIFFS = {};
  const TAB_ORIGINAL_STYLES = {};
  const LAST_RECEIVED_TAB_ORIGINAL_STYLES = {};

  const stopMonitoringTabID = tabId => {
    _stopMonitoringTabID(tabId);

    delete TAB_IDS_STYLESHEET_DIFFS[tabId];
    delete TAB_ORIGINAL_STYLES[tabId];
    delete TAB_ORIGINAL_STYLES[tabId];
    delete LAST_RECEIVED_TAB_ORIGINAL_STYLES[tabId];
  };

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

  const toggleStylebar = (tabId, show) => {
    const script = (idName, opacity) => {
      document.getElementById(idName).style.opacity = opacity;
    };

    return new Promise(resolve => {
      chrome.tabs.executeScript(
        tabId,
        {
          code: `(${script.toString()})("${
            injectScriptNames.inject_create_styleurl
          }", ${show ? 1 : 0})`,
          runAt: "document_start"
        },
        () => {
          setTimeout(() => {
            resolve();
          }, 50);
        }
      );
    });
  };

  const sendStyleURLsToTab = ({ tabId }) => {
    styleURLsForTabId(tabId).forEach(styleurl => {
      stylesheetManagerConnection.sendMessage(
        `content_script:${PORT_TYPES.stylesheet_manager}:${tabId}`,
        { kind: MESSAGE_TYPES.get_styleurl, value: styleurl.toJSON() }
      );
    });
  };

  const autodetectStyleURL = async ({ url, tabId }) => {
    const gistId = getGistIDFromURL(url);

    if (!gistId) {
      return;
    }

    await startMonitoringTabID({ tabId, gistId });
    sendStyleURLsToTab({ tabId });

    injectCSSManager(tabId);
  };

  const handleInlineStyleObserverMessages = async (
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

    if (
      kind === MESSAGE_TYPES.style_diff_changed &&
      !styleURLsForTabId(tabId).length
    ) {
      injectCreateStyleURLBar(tabId, success => {
        if (!success) {
          return;
        }

        inlineHeaderConnection.sendMessage(
          `content_script:${PORT_TYPES.inline_header}:${tabId}`,
          {
            kind: MESSAGE_TYPES.open_style_editor
          }
        );
      });
    }
    log(request.value);
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
    } else if (kind === kinds.send_feedback) {
      sendFeedback({
        message: request.value.message,
        from: request.value.from
      });
    } else if (kind === kinds.get_current_styles_diff) {
      if (
        !DEVTOOLS_OPEN_TABS[tabId] &&
        request.value &&
        request.value.devtools_required
      ) {
        inlineHeaderConnection.sendMessage(
          `content_script:${PORT_TYPES.inline_header}:${tabId}`,
          {
            kind: MESSAGE_TYPES.open_devtools_plz
          }
        );
      }

      getCurrentStylesheetsDiff(tabId).then(response => sendResponse(response));
    } else if (kind === kinds.send_success_notification) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.extension.getURL(DEFAULT_ICON_PATH["128"]),
        title: !request.value.didCopy
          ? `Created styleurl`
          : "Copied your styleurl to clipboard",
        message:
          "Your CSS changes have been exported to a styleurl successfully. Now you can share it!"
      });
    } else if (kind === kinds.get_styleurl) {
      const styleURL = _.first(styleURLsForTabId(tabId));
      sendResponse({ value: styleURL, kind });
    } else if (kind === kinds.update_styleurl_state) {
      const styleURL = _.first(styleURLsForTabId(tabId));
      const { isBarEnabled, isStyleEnabled } = request.value;

      if (isBarEnabled !== styleURL.isBarEnabled) {
        styleURL.isBarEnabled = isBarEnabled;
      }

      if (isStyleEnabled !== styleURL.isStyleEnabled) {
        styleURL.isStyleEnabled = isStyleEnabled;
      }

      inlineHeaderConnection.sendMessage(
        `content_script:${PORT_TYPES.inline_header}:${tabId}`,
        { value: styleURL, kind: kinds.update_styleurl_state }
      );

      if (!from.includes(PORT_TYPES.stylesheet_manager)) {
        sendStyleURLsToTab({ tabId });
      }
    } else if (kind === kinds.shared_styleurl) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.extension.getURL(DEFAULT_ICON_PATH["128"]),
        title: "Copied styleurl to clipboard",
        message: "Share the styleurl by pasting it to a friend or colleague"
      });
    } else if (kind === kinds.upload_stylesheets) {
      toggleStylebar(tabId, false).then(() => {
        chrome.tabs.captureVisibleTab(null, { format: "png" }, async function(
          photo
        ) {
          uploadStylesheets({
            stylesheets: request.value.stylesheets,
            url: tab.url,
            visibility: request.value.visibility
          }).then(stylesheetResponse => {
            sendResponse(stylesheetResponse);
            if (stylesheetResponse.success) {
              chrome.tabs.update(tabId, { selected: true });

              window.setTimeout(async () => {
                // Capturing the photo fails sometimes shrug
                if (photo) {
                  uploadScreenshot({
                    photo: await toFile(photo, SCREENSHOT_CONTENT_TYPE),
                    key: stylesheetResponse.data.id,
                    domain: stylesheetResponse.data.domain
                  });
                }

                toggleStylebar(tabId, true);
              }, 50);
            } else {
              alert("Something didnt work quite right. Please try again!");
            }
          });
        });
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
    } else if (kind === kinds.open_style_editor) {
      injectCreateStyleURLBar(tabId);
    } else if (
      kind === kinds.style_diff_changed &&
      shouldAssumeChangesAreReal(tabId) &&
      !styleURLsForTabId(tabId)
    ) {
      injectCreateStyleURLBar(tabId);
    }
  };

  const getInlineStylesDiff = tabId => {
    return inlineStyleObserverConnection
      .sendMessage(
        `content_script:${PORT_TYPES.inline_style_observer}:${tabId}`,
        {
          kind: MESSAGE_TYPES.get_inline_style_diff
        }
      )
      .then(response => {
        log("Received inline styles!");

        const { old_stylesheet, new_stylesheet } = response.value;

        if (!new_stylesheet || !new_stylesheet.content) {
          return null;
        }

        const content = old_stylesheet
          ? diffSheet(old_stylesheet.content, new_stylesheet.content)
          : new_stylesheet.content;

        return {
          url: new_stylesheet.url,
          content
        };
      });
  };

  const getCurrentStylesheetsDiff = tabId => {
    console.time("Diff All Sheets");
    return devtoolConnection
      .sendMessage(`devtool:${PORT_TYPES.devtool_widget}:${tabId}`, {
        kind: MESSAGE_TYPES.get_current_styles_diff
      })
      .then(
        async response => {
          log("Received styles!");
          let modifiedSheets = response.value.stylesheets.slice();
          const currentStyles = response.value.general_stylesheets;
          const oldStyles = TAB_ORIGINAL_STYLES[tabId];
          if (oldStyles) {
            oldStyles
              .filter(
                style =>
                  style.url &&
                  style.url.indexOf("inject_create_styleurl.css") === -1 // this comes up ugh
              )
              .forEach(oldStyle => {
                const newStyle = currentStyles.find(
                  style => style.url === oldStyle.url
                );

                console.time("Diff Sheet [No Memoize]");
                const diffedStyle = diffSheet(
                  oldStyle ? oldStyle.content || "" : "",
                  newStyle ? newStyle.content || "" : ""
                );
                console.timeEnd("Diff Sheet [No Memoize]");

                if (diffedStyle && diffedStyle.trim().length > 0) {
                  modifiedSheets.push({
                    url: oldStyle.url,
                    content: diffedStyle
                  });
                }
              });
          }

          TAB_IDS_STYLESHEET_DIFFS[tabId] = modifiedSheets;

          try {
            const fauxInlineStylesheet = await getInlineStylesDiff(tabId);

            if (fauxInlineStylesheet) {
              modifiedSheets.push(fauxInlineStylesheet);
            }
          } catch (exception) {
            console.error(exception);
          }

          console.timeEnd("Diff All Sheets");

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

  const autoInsertCSS = async tab => {
    await autodetectStyleURL(tab);
    const styleURLs = styleURLsForTabId(tab.tabId);

    // Handle case where we haven't loaded the styleurl gist yet
    const pendingStyleURLs = styleURLs.filter(({ loaded = false }) => !loaded);
    if (pendingStyleURLs) {
      await Promise.all(
        pendingStyleURLs.map(styleurl => styleurl.load(styleurl.gistId))
      );
    }

    const appliedStyles = styleURLs.filter(styleURLTab =>
      styleURLTab.applyToTab(tab, stylesheetManagerConnection)
    );

    const styleCount = appliedStyles.length;
    if (styleCount > 0) {
      setBrowserActionToStyleApplied({ tabId: tab.tabId, styleCount });
    } else {
      // TODO: see if this is too aggro
      setBrowserActionToDefault({ tabId: tab.tabId });
    }
  };

  chrome.webNavigation.onCommitted.addListener(tab =>
    stopMonitoringTabID(tab.tabId)
  );
  chrome.webNavigation.onCommitted.addListener(autoInsertCSS);
  chrome.webNavigation.onHistoryStateUpdated.addListener(({ tabId, url }) =>
    autodetectStyleURL({ url, tabId })
  );

  chrome.webNavigation.onReferenceFragmentUpdated.addListener(({ tabId }) =>
    sendStyleURLsToTab({ tabId })
  );

  const injectBarHistoryListener = async ({ tabId, url }) => {
    if (!url) {
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

    if (
      styleURLs
        .filter(({ isBarEnabled }) => isBarEnabled)
        .find(styleURL => styleURL.canApplyStyle(url))
    ) {
      injectViewStyleURLBar(tabId);
    }
  };

  chrome.webNavigation.onDOMContentLoaded.addListener(injectBarHistoryListener);

  chrome.webNavigation.onHistoryStateUpdated.addListener(
    injectBarHistoryListener
  );
  chrome.webNavigation.onTabReplaced.addListener(injectBarHistoryListener);

  chrome.tabs.onRemoved.addListener(tabId => {
    if (TAB_IDS_TO_APPLY_STYLES[tabId]) {
      stopMonitoringTabID(tabId);
    }

    if (DEVTOOLS_OPEN_TABS[tabId]) {
      DEVTOOLS_OPEN_TABS[tabId] = false;
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

  stylesheetManagerConnection = messenger.initConnection(
    PORT_TYPES.stylesheet_manager,
    handleInlineHeaderMessages
  );

  inlineStyleObserverConnection = messenger.initConnection(
    PORT_TYPES.inline_style_observer,
    handleInlineStyleObserverMessages
  );

  // If you just installed and have a styleURL page open, reload the tab so that the content script is loaded
  chrome.runtime.onInstalled.addListener(() => {
    chrome.tabs.query({ url: `${__FRONTEND_HOST__}/*` }, tabs => {
      tabs.forEach(tab => chrome.tabs.reload(tab.id));

      // See if there's any active non-homepage StyleURL tabs and set it to active
      // Basically we want to ignore / and all of the root routes
      // We _do_ want "/news.ycombinator.com/long_gist_id"
      const styleURLTab = tabs.find(
        tab =>
          `${__FRONTEND_HOST__}/`.split("/").length < tab.url.split("/").length
      );
      // Also set it to active
      if (styleURLTab) {
        chrome.tabs.update(styleURLTab.id, { active: true });
      }
    });
  });
});
