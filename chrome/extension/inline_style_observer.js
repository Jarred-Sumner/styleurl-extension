import { InlineStyleObserverManager } from "./inline_style_observer/inline_style_observer_manager";

const startManager = () => {
  window.__InlineStyleObserverManager = new InlineStyleObserverManager();
};

if (!window.__InlineStyleObserverManager) {
  startManager();
}
