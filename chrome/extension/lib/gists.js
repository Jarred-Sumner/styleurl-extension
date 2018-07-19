import _ from "lodash";
import { loadStylefileFromString } from "./stylefile";

export const STYLEFILE_NAMES = ["Stylefile.yml", "Stylefile"];
export const SPECIAL_QUERY_PARAMS = {
  gist_id: "__styleurl"
};

export const getGistById = id =>
  window
    .fetch(`https://api.github.com/gists/${id}`, {
      redirect: "follow",
      credentials: "include",
      headers: {
        "Cache-Control": "public, max-age=9999999, s-maxage=9999999"
      }
    })
    .then(resp => {
      return resp.json();
    });

export const getGistIDFromURL = url => {
  const queryString = _.last(url.split("?"));

  if (!queryString) {
    return null;
  }

  const params = new URLSearchParams(queryString);

  return _.last(params.get(SPECIAL_QUERY_PARAMS.gist_id).split("gist_"));
};

export const getStylesheetsFromGist = gist => {
  return _
    .keys(gist.files || [])
    .filter(fileName => {
      const file = gist.files[fileName];

      return file.type === "text/css";
    })
    .map(filename => [filename, gist.files[filename].content]);
};

export const loadStylefileFromGist = gist => {
  const filename = _.keys(gist.files || []).find(fileName => {
    return STYLEFILE_NAMES.includes(fileName);
  });

  if (!filename) {
    return null;
  }

  return loadStylefileFromString(gist.files[filename].content);
};
