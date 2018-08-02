import injectScriptNames from "../lib/injectScriptNames";
import browser from "webextension-polyfill";

const log = (...messages) =>
  console.log.apply(console, ["[inject]", ...messages]);

function isInjected(tabId, name) {
  const scriptName = injectScriptNames[name];
  return browser.tabs.executeScript(tabId, {
    code: `!!document.querySelector("#${scriptName}")`,
    runAt: "document_start"
  });
}

export async function loadScript(name, tabId, runAt = "document_end") {
  if (runAt !== "document_start") {
    const didInject = await isInjected(tabId, name);
    if (didInject) {
      log("SKIP injecting script", name, "into", tabId);
      return Promise.resolve(false);
    }
  }

  log("Injecting script", name, "into", tabId);

  return browser.tabs
    .executeScript(tabId, {
      file: `/${name}.bundle.js`,
      runAt,
      allFrames: false
    })
    .then(() => true);
}

export const injectCreateStyleURLBar = (tabId, cb) => {
  return loadScript("inject_create_styleurl", tabId).then(cb);
};

export const injectViewStyleURLBar = (tabId, cb) => {
  return loadScript("inject_view_styleurl", tabId).then(cb);
};

export const injectCSSManager = (tabId, cb) => {
  return loadScript("css_manager_content_script", tabId, "document_start").then(
    cb
  );
};

export const injectInlineStyleObserver = (tabId, cb) => {
  return loadScript("inline_style_observer", tabId, "document_start").then(cb);
};
