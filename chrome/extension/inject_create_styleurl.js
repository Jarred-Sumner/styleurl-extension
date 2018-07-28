import { injectShadowDOM } from "./lib/injectShadowDom";
import CreateStyleURL from "./create_styleurl/CreateStyleURL";
import "./create_styleurl.css";
import injectScriptNames from "./lib/injectScriptNames";

injectShadowDOM({
  id: injectScriptNames.inject_create_styleurl,
  Component: CreateStyleURL,
  include: chrome.extension.getURL("/inject_create_styleurl.css")
});
