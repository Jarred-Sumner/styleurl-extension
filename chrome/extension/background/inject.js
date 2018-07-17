const log = (...messages) =>
  console.log.apply(console, ["[inject]", ...messages]);

function isInjected(tabId) {
  return chrome.tabs.executeScript(tabId, {
    code: `var injected = window.reactExampleInjected;
      window.reactExampleInjected = true;
      injected;`,
    runAt: "document_start"
  });
}

export async function loadScript(name, tabId, cb) {
  const didInject = await isInjected(tabId);
  if (didInject) {
    log("SKIP injecting script", name, "into", tabId);
    return;
  }

  log("Injecting script", name, "into", tabId);

  chrome.tabs.executeScript(
    tabId,
    { file: `/${name}.bundle.js`, runAt: "document_end", allFrames: false },
    cb
  );
}
