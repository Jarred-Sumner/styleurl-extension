const writeVersionToDOM = () => {
  const metadata = {
    id: chrome.runtime.id,
    environment: process.env.NODE_ENV,
    version: chrome.runtime.getManifest().version
  };

  const scriptTag = document.createElement("script");
  scriptTag.id = `__styleurl-extension`;
  scriptTag.type = "application/json";

  scriptTag.innerHTML = JSON.stringify(metadata);

  document.documentElement.appendChild(scriptTag);
  console.log("Wrie Version");
};

if (document.body) {
  writeVersionToDOM();
} else {
  window.addEventListener("DOMContentLoaded", writeVersionToDOM);
}
