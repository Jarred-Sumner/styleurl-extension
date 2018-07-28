// This file is loosely based on https://github.com/openstyles/stylus/blob/master/content/apply.js
// Though, heavily refactored to use a more OO approach than imperative
import Messenger from "chrome-ext-messenger";
import { PORT_TYPES } from "./lib/port";

const messenger = new Messenger();

const ID_PREFIX = "__styleurl";
const ROOT = document.documentElement;

class DocumentRootObserver {
  ORDERED_TAGS = ["head", "body", "frameset", "style", "link"];

  constructor({rootEl}) {
    this.lastRestorationTime = 0;
    this.restoractionCounter = 0;
    this.observing = false;
    this.sorting = false;
    this.rootEl = rootEl;

    this.observer = new MutationObserver(this.sortStyleElements);
    setTimeout(this.sortStyleElements);
  }

  start = ({ sort = false } = {}) => {
    if (sort && this.sortStyleMap()) {
      this.sortStyleElements();
    }

    if (!this.observing && this.rootEl && this.observer) {
      this.observer.observe(this.rootEl, { childList: true });
      this.observing = true;
    }
  }

  function stop() {
    if (observing) {
      observer.takeRecords();
      observer.disconnect();
      observing = false;
    }
  }
  function evade(fn) {
    const wasObserving = observing;
    if (observing) {
      stop();
    }
    fn();
    if (wasObserving) {
      start();
    }
  }
  function sortStyleMap() {
    const list = [];
    let prevStyleId = 0;
    let needsSorting = false;
    for (const entry of styleElements.entries()) {
      list.push(entry);
      const el = entry[1];
      const styleId = getStyleId(el);
      el.styleId = styleId;
      needsSorting |= styleId < prevStyleId;
      prevStyleId = styleId;
    }
    if (needsSorting) {
      styleElements = new Map(
        list.sort((a, b) => a[1].styleId - b[1].styleId)
      );
      return true;
    }
  }
  function sortStyleElements() {
    if (!observing) {
      return;
    }
    let prevExpected = document.documentElement.lastElementChild;
    while (prevExpected && isSkippable(prevExpected, true)) {
      prevExpected = prevExpected.previousElementSibling;
    }
    if (!prevExpected) {
      return;
    }
    for (const el of styleElements.values()) {
      if (!isMovable(el)) {
        continue;
      }
      while (true) {
        const next = prevExpected.nextElementSibling;
        if (next && isSkippable(next)) {
          prevExpected = next;
        } else if (
          next === el ||
          (next === el.previousElementSibling && next) ||
          moveAfter(el, next || prevExpected)
        ) {
          prevExpected = el;
          break;
        } else {
          return;
        }
      }
    }
    if (sorting) {
      sorting = false;
      if (observer) observer.takeRecords();
      if (!restorationLimitExceeded()) {
        start();
      } else {
        setTimeout(start, 1000);
      }
    }
  }
  function isMovable(el) {
    return el.parentNode || !disabledElements.has(getStyleId(el));
  }
  function isSkippable(el, skipOwnStyles) {
    return (
      !ORDERED_TAGS.includes(el.localName) ||
      (el.id.startsWith(ID_PREFIX) &&
        (skipOwnStyles || el.id.endsWith("-ghost")) &&
        el.localName === "style" &&
        el.className === "stylus")
    );
  }
  function moveAfter(el, expected) {
    if (!sorting) {
      sorting = true;
      stop();
    }
    expected.insertAdjacentElement("afterend", el);
    if (el.disabled !== disableAll) {
      // moving an element resets its 'disabled' state
      el.disabled = disableAll;
    }
    return true;
  }
  function restorationLimitExceeded() {
    const t = performance.now();
    if (t - lastRestorationTime > 1000) {
      restorationCounter = 0;
    }
    lastRestorationTime = t;
    return ++restorationCounter > 5;
  }
}

class StylesheetManager {
  constructor() {
    this.disableAllStyles = false;
    this.exposeIframes = false;
    this.docRewriteObserver = null;
    this.docRootObserver = null;
    this.styleElements = new Map();
    this.disabledElements = new Map();
    this.retiredStyleTimers = new Map();

    this.connection = messenger.initConnection(
      PORT_TYPES.stylesheet_manager,
      this.handleMessage
    );
  }

  handleMessage = () => {};

  get matchURL() {
    const matchURL = location.href;
    if (matchURL.match(/^(http|file|chrome|ftp)/)) {
      // dynamic about: and javascript: iframes don't have an URL yet
      // so we'll try the parent frame which is guaranteed to have a real URL
      try {
        if (window !== parent) {
          return parent.location.href;
        }
      } catch (e) {}
    }

    return matchURL;
  }

  get styleTagQuery() {
    return `style.styleurl[id^="${ID_PREFIX}"]`;
  }

  getStyles = () => {};

  setDisableAllStyles = shouldDisableAll => {
    if (!this.disableAllStyles === !shouldDisableAll) {
      return;
    }

    this.disableAllStyles = shouldDisableAll;

    Array.prototype.forEach.call(document.styleSheets, stylesheet => {
      if (
        stylesheet.ownerNode.matches(this.styleTagQuery) &&
        stylesheet.disabled !== shouldDisableAll
      ) {
        stylesheet.disabled = shouldDisableAll;
      }
    });
  };

  removeStyle = ({ id, expire = false }) => {
    const el = document.getElementById(ID_PREFIX + id);
    if (el && retire) {
      // to avoid page flicker when the style is updated
      // instead of removing it immediately we rename its ID and queue it
      // to be deleted in applyStyles after a new version is fetched and applied
      const expiredID = id + "-expired";
      el.id = ID_PREFIX + deadID;
      // in case something went wrong and new style was never applied
      retiredStyleTimers.set(
        expiredID,
        window.setTimeout(() => this.removeStyle({ id: expiredID }), 1000)
      );
    } else if (el) {
      docRootObserver.evade(() => el.remove());
    }

    this.styleElements.delete(ID_PREFIX + id);
    this.disabledElements.delete(id);
    this.retiredStyleTimers.delete(id);
  };

  updateStylesheets = styles => {
    if (!document.documentElement) {
      new MutationObserver((mutations, observer) => {
        if (document.documentElement) {
          observer.disconnect();
          applyStyles(styles);
        }
      }).observe(document, { childList: true });
      return;
    }

    if ("disableAll" in styles) {
      doDisableAll(styles.disableAll);
    }

    const gotNewStyles = styles.length;
    if (gotNewStyles) {
      if (docRootObserver) {
        docRootObserver.stop();
      } else {
        initDocRootObserver();
      }
    }

    if (styles.needTransitionPatch) {
      applyTransitionPatch();
    }

    if (gotNewStyles) {
      for (const id in styles) {
        const sections = styles[id];
        if (!Array.isArray(sections)) continue;
        applySections(id, sections.map(({ code }) => code).join("\n"));
      }
      docRootObserver.start({ sort: true });
    }

    if (!isOwnPage && !docRewriteObserver && styleElements.size) {
      initDocRewriteObserver();
    }

    if (retiredStyleTimers.size) {
      setTimeout(() => {
        for (const [id, timer] of retiredStyleTimers.entries()) {
          removeStyle({ id });
          clearTimeout(timer);
        }
      });
    }
  };
}
