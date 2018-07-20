import { MESSAGE_TYPES, PORT_TYPES } from "./lib/port";
import { SPECIAL_QUERY_PARAMS, STYLEFILE_NAMES } from "./lib/gists";
import { loadStylefileFromString } from "./lib/stylefile";
import Messenger from "chrome-ext-messenger";

const messenger = new Messenger();
const connection = messenger.initConnection(PORT_TYPES.github_gist);

const getGistID = () => window.location.pathname.split("/")[2];

const buildStyleURL = styleFile => {
  const originalURL = styleFile.redirect_url;

  const queryString = originalURL.includes("?")
    ? originalURL.split("?")[1]
    : "";
  const searchParams = new URLSearchParams(queryString);

  searchParams.append(SPECIAL_QUERY_PARAMS.gist_id, `gist_${getGistID()}`);

  return `${originalURL}?${searchParams.toString()}`;
};

const log = (...messages) =>
  console.log.apply(console, ["[StyleURL]", ...messages]);

const renderStyleURLBar = styleFile => {
  log("Detected Stylefile", styleFile);

  const div = document.createElement("div");
  div.innerHTML = `<div style="background-color: #0366d6; padding-top: 14px; padding-bottom: 14px;"><div class="container-lg px-3 clearfix"><div id="styleurl_bar_root" style="display: flex; justify-content: space-between; align-items: center; color white;">
  <div style="font-size: 18px; white-space: nowrap; color: white;">Apply this StyleURL on <strong>${
    styleFile.domains[0]
  }</strong>?</div>

  <a href="${buildStyleURL(styleFile)}" class="btn">Apply StyleURL</a>
</div></div></div>`;
  document.body.prepend(div);
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
  return connection
    .sendMessage(`background:${PORT_TYPES.github_gist}`, {
      kind: MESSAGE_TYPES.get_gist_content,
      url: getFileURL(filename)
    })
    .then(({ value }) => {
      return value;
    });
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
        return loadStylefileFromString(yaml);
      })
      .then(styleFile => {
        if (!styleFile) {
          return;
        }

        renderStyleURLBar(styleFile);
      });
  });
}
