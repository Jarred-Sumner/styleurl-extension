import { injectShadowDOM } from "./lib/injectShadowDom";
import injectScriptNames from "./lib/injectScriptNames";
import ViewStyleURLContainer from "./view_styleurl/ViewStyleURL";

injectShadowDOM({
  id: injectScriptNames.view_styleurl,
  Component: ViewStyleURLContainer,
  include: [chrome.extension.getURL("/inject_view_styleurl.css")]
});
