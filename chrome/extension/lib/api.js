import S3Upload from "react-s3-uploader/s3upload";

const uploaders = {};
export const SCREENSHOT_CONTENT_TYPE = "image/png";

export const buildURL = path => {
  return __API_HOST__ + path;
};

const apiFetch = (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  headers.append(
    "User-Agent",
    `StyleURL v${chrome.app.getDetails().version} (${process.env.NODE_ENV})`
  );
  headers.append("Content-Type", "application/json");
  headers.append("X-StyleURL-Version", chrome.app.getDetails().version);

  return window
    .fetch(buildURL(path), {
      ...options,
      credentials: "include",
      redirect: "follow",
      headers
    })
    .then(response => response.json())
    .catch(error => {
      console.error(error);
      return {
        success: false
      };
    });
};

export const getGistById = id => apiFetch(`/api/gists/${id}`);

export const uploadStylesheets = async ({
  stylesheets,
  url,
  visibility = "public"
}) => {
  return apiFetch("/api/stylesheet_groups", {
    method: "POST",
    body: JSON.stringify({
      url,
      stylesheets,
      visibility
    })
  });
};

export const sendFeedback = async ({ message, from }) => {
  return apiFetch("/api/feedback", {
    method: "POST",
    body: JSON.stringify({
      message,
      version: chrome.runtime.getManifest().version,
      from
    })
  });
};

export const processScreenshot = ({
  key: stylesheet_key,
  domain: stylesheet_domain
}) => ({ publicUrl: url }) => {
  return apiFetch("/api/photos/process", {
    method: "POST",
    body: JSON.stringify({
      url,
      stylesheet_key,
      stylesheet_domain,
      content_type: SCREENSHOT_CONTENT_TYPE
    })
  }).then(() => {
    delete uploaders[stylesheet_key];
  });
};

export const uploadScreenshot = ({ key, domain, photo }) => {
  uploaders[key] = new S3Upload({
    files: [photo],
    signingUrl: "/api/photos/presign",
    onFinishS3Put: processScreenshot({ key, domain }),
    onError: error => {
      console.error(error);
      delete uploaders[key];
    },
    server: __API_HOST__,
    uploadRequestHeaders: {}
  });
};
