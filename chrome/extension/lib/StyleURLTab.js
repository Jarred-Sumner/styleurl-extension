import {
  getGistById,
  loadStylefileFromGist,
  getStylesheetsFromGist
} from "./gists";
import { shouldApplyStyleToURL } from "./stylefile";

const TAB_IDS_TO_STYLEURL = {};

const applyStylesheetToTabId = (stylesheet, tabId) => {
  const content = stylesheet[1];
  return chrome.tabs.insertCSS(
    tabId,
    {
      cssOrigin: "user",
      allFrames: true,
      code: content,
      runAt: "document_start"
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

  applyToTab = tab => {
    if (!this.canApplyStyle(tab.url)) {
      return this.setAppliedToURL(tab.url, false);
    }

    this.stylesheets.forEach(stylesheet =>
      applyStylesheetToTabId(stylesheet, tab.id)
    );

    return this.setAppliedToURL(tab.url, true);
  };

  canApplyStyle = url => {
    return (
      !!this.stylefile &&
      this.isStyleEnabled &&
      shouldApplyStyleToURL(this.stylefile, url)
    );
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
  if (!existingStyleURLTab) {
    const styleUrlTab = new StyleURL({ gistId });
    TAB_IDS_TO_STYLEURL[tabId].push(styleUrlTab);
    await styleUrlTab.load(gistId);
  }
};

export const stopMonitoringTabID = tabId => {
  if (TAB_IDS_TO_STYLEURL[tabId].length === 0) {
    delete TAB_IDS_TO_STYLEURL[tabId];
  }
};
