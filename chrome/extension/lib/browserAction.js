const PLUS_IMAGE_PATH = {
  "16": "img/plus_16x16.png",
  "19": "img/plus_19x19.png",
  "38": "img/plus_38x38.png",
  "48": "img/plus_48x48.png",
  "128": "img/plus_128x128.png"
};

export const DEFAULT_ICON_PATH = {
  "16": "img/default_16x16.png",
  "19": "img/default_19x19.png",
  "38": "img/default_38x38.png",
  "48": "img/default_48x48.png",
  "128": "img/default_128x128.png"
};

export const BROWSER_ACTION_STATES = {
  default: "default",
  style_applied: "style_applied",
  upload_style: "upload_style"
};

let BROWSER_ACTION_STATE = BROWSER_ACTION_STATES.default;

export const setBrowserActionToDefault = ({ tabId }) => {
  try {
    chrome.browserAction.setIcon({
      tabId,
      path: DEFAULT_ICON_PATH
    });
    chrome.browserAction.setTitle({
      tabId,
      title: "StyleURL"
    });

    BROWSER_ACTION_STATE = BROWSER_ACTION_STATES.default;
  } catch (exception) {
    console.error(exception);
  }
};

export const setBrowserActionToStyleApplied = ({ styleCount, tabId }) => {
  try {
    chrome.browserAction.setIcon({
      tabId,
      path: DEFAULT_ICON_PATH
    });

    chrome.browserAction.setBadgeText({
      text: `${styleCount}`,
      tabId: tabId
    });

    BROWSER_ACTION_STATE = BROWSER_ACTION_STATES.style_applied;
  } catch (exception) {
    console.error(exception);
  }
};

export const getBrowserActionState = () => BROWSER_ACTION_STATE;
