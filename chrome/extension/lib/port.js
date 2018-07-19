import _ from "lodash";
const DEV_CHROME_PORT_PREFIX = "STYLEURL_DEV_PORT/";
const PROD_CHROME_PORT_PREFIX = "STYLEURL_PORT/";

const CHROME_PORT_PREFIX =
  process.env.NODE_ENV === "PRODUCTION"
    ? PROD_CHROME_PORT_PREFIX
    : DEV_CHROME_PORT_PREFIX;

export const tabIdFromPortName = _portName => {
  return parseInt(_.last(_portName.split("tab/")), 10);
};

export const PORT_TYPES = {
  github_gist: "github_gist",
  inline_header: "inline_header",
  devtool_widget: "devtool_widget"
};

export const MESSAGE_TYPES = {
  get_styles_diff: "get_styles_diff",
  get_gist_content: "get_gist_content",
  apply_stylesheets: "apply_stylesheets",
  style_diff_changed: "style_diff_changed",
  send_content_stylesheets: "send_stylesheets",
  log: "log",
  create_style_url: "create_style_url",
  send_success_notification: "send_success_notification",
  toggle_styleurl_css: "toggle_styleurl_css",
  get_styleurl: "get_styleurl",
  update_styleurl_state: "update_styleurl_state"
};

export const STYLESHEET_TYPE = {
  inspector: "inspector",
  remote: "remote",
  style_tag: "style_tag"
};
