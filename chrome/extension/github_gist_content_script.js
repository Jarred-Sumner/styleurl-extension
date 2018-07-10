import YAML from "js-yaml";
import { MESSAGE_TYPES } from "./lib/port";
const STYLEFILE_NAMES = ["Stylefile.yml", "Stylefile"];

const log = (...messages) =>
  console.log.apply(console, ["[StyleURL]", ...messages]);

const renderStyleURLBar = styleFile => {
  log("Detected Stylefile.yml", styleFile);
};

// Hard to know 100% of the time whether or not we're on the gist page
const isGistPage = pathname => {
  const parts = pathname.split("/");
  const isCorrectLength = parts.length === 3; // ["", "User-Name", "hash"]

  if (!isCorrectLength) {
    return false;
  }

  const gistId = parts[2];

  return gistId.length > 5;
};

const isRawDownloadLink = pathname => {
  return pathname.includes("/raw/");
};

const getGistFilenames = () => {
  return window
    .fetch(window.location.pathname + ".json")
    .then(resp => resp.json(), () => false)
    .then(
      gist => {
        if (!gist || !gist.files) {
          return [];
        }

        return gist.files || [];
      },
      () => []
    );
};

const getFileURL = filename => {
  const files = Array.from(document.querySelectorAll(".file-box"));

  const fileBox = files.find(fileBox =>
    Array.from(fileBox.querySelectorAll(".file-info .gist-blob-name")).find(
      element => element.innerText === filename
    )
  );

  if (!fileBox) {
    return null;
  }

  const rawFileLink = Array.from(
    fileBox.querySelectorAll(".file-actions a.btn")
  ).find(element => isRawDownloadLink(element.href));

  if (!rawFileLink) {
    return null;
  }

  return rawFileLink.href;
};

const getGistFileContents = filename => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: MESSAGE_TYPES.get_gist_content,
        url: getFileURL(filename),
        response: false
      },
      response => {
        resolve(response);
      }
    );
  }).then(({ content }) => content);
};

if (isGistPage(location.pathname)) {
  getGistFilenames().then(fileNames => {
    if (!fileNames) {
      return null;
    }

    const filename = fileNames.find(name => STYLEFILE_NAMES.indexOf(name) > -1);
    if (!filename) {
      return;
    }

    getGistFileContents(filename)
      .then(yaml => {
        return YAML.safeLoad(yaml);
      })
      .then(styleFile => {
        if (!styleFile) {
          return;
        }

        renderStyleURLBar(styleFile);
      });
  });
}
