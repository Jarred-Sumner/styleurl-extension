import injectScriptNames from "../lib/injectScriptNames";

const log = (...messages) =>
  console.log.apply(console, ["[inject]", ...messages]);

function isInjected(tabId, name) {
  return new Promise((resolve, reject) => {
    const scriptName = injectScriptNames[name];
    chrome.tabs.executeScript(
      tabId,
      {
        code: `!!document.querySelector("#${scriptName}")`,
        runAt: "document_start"
      },
      results => resolve(results[0])
    );
  });
}

export async function loadScript(name, tabId, cb, runAt = "document_end") {
  if (runAt !== "document_start") {
    const didInject = await isInjected(tabId, name);
    if (didInject) {
      log("SKIP injecting script", name, "into", tabId);
      return;
    }
  }

  log("Injecting script", name, "into", tabId);

  chrome.tabs.executeScript(
    tabId,
    { file: `/${name}.bundle.js`, runAt, allFrames: false },
    cb
  );
}

export const injectCreateStyleURLBar = (tabId, cb) => {
  loadScript("inject_create_styleurl", tabId, cb);
};

export const injectViewStyleURLBar = (tabId, cb) => {
  loadScript("inject_view_styleurl", tabId, cb);
};

export const injectCSSManager = (tabId, cb) => {
  loadScript("css_manager_content_script", tabId, cb, "document_start");
};

export const injectInlineStyleObserver = (tabId, cb) => {
  loadScript("inline_style_observer", tabId, cb, "document_start");
};
