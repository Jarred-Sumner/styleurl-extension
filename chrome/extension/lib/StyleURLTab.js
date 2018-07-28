import {
  getGistById,
  loadStylefileFromGist,
  getStylesheetsFromGist
} from "./gists";
import { shouldApplyStyleToURL } from "./stylefile";
import { injectCSSManager } from "../background/inject";
import { MESSAGE_TYPES, PORT_TYPES } from "./port";

const TAB_IDS_TO_STYLEURL = {};

const applyStylesheetToTabId = (stylesheet, tabId) => {
  const content = stylesheet[1];
  chrome.tabs.insertCSS(
    tabId,
    {
      cssOrigin: "user",
      code: content,
      allFrames: true,
      runAt: "document_end"
    },
    (...args) => {
      console.log("Inserted Stylesheet into tab", tabId, {
        stylesheet: content
      });
    }
  );
};

export class StyleURL {
  constructor({ gistId }) {
    this.gistId = gistId;

    this.isBarEnabled = true;
    this.isStyleEnabled = true;
    this._appliedToURLs = {};
  }

  toJSON = () => {
    return {
      gistId: this.gistId,
      gist: this.gist,
      isBarEnabled: this.isBarEnabled,
      isStyleEnabled: this.isStyleEnabled,
      stylefile: this.stylefile,
      stylesheets: this.stylesheets,
      appliedToURLS: this._appliedToURLs
    };
  };

  setAppliedToURL = (url, didApply) => {
    this._appliedToURLs[url] = !!didApply;

    return !!didApply;
  };

  load = async gistId => {
    const gist = await getGistById(gistId);
    this.gist = gist;
    this.stylefile = loadStylefileFromGist(gist);
    this.stylesheets = getStylesheetsFromGist(gist);
    this.loaded = true;
  };

  applyToTab = (tab, connection) => {
    if (!this.canApplyStyle(tab.url)) {
      return this.setAppliedToURL(tab.url, false);
    }

    injectCSSManager(tab.tabId);
    if (connection) {
      connection.sendMessage(
        `content_script:${PORT_TYPES.stylesheet_manager}:${tab.tabId}`,
        {
          kind: MESSAGE_TYPES.get_styleurl,
          value: this.toJSON()
        }
      );
    }

    return this.setAppliedToURL(tab.url, true);
  };

  canApplyStyle = url => {
    return !!this.stylefile && shouldApplyStyleToURL(this.stylefile, url);
  };
}

export const styleURLsForTabId = tabId => {
  return TAB_IDS_TO_STYLEURL[tabId] || [];
};

export const startMonitoringTabID = async ({ tabId, gistId }) => {
  if (!TAB_IDS_TO_STYLEURL[tabId]) {
    TAB_IDS_TO_STYLEURL[tabId] = [];
  }

  const existingStyleURLTab = TAB_IDS_TO_STYLEURL[tabId].find(
    tab => tab.gistId === gistId
  );
  if (existingStyleURLTab) {
    return existingStyleURLTab;
  } else {
    const styleUrlTab = new StyleURL({ gistId });
    TAB_IDS_TO_STYLEURL[tabId].push(styleUrlTab);
    await styleUrlTab.load(gistId);

    return styleUrlTab;
  }
};

export const stopMonitoringTabID = tabId => {
  if (TAB_IDS_TO_STYLEURL[tabId] && TAB_IDS_TO_STYLEURL[tabId].length === 0) {
    delete TAB_IDS_TO_STYLEURL[tabId];
  }
};
