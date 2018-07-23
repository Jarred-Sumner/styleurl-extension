import Messenger from "chrome-ext-messenger";
import { PORT_TYPES, MESSAGE_TYPES } from "../lib/port";
import { InlineStyleObserver } from "./inline_style_observer";

const buildRuleFromSelectorAndCssText = (selector, text) => {
  return `${selector} { ${text} }`;
};

export class InlineStyleObserverManager {
  constructor() {
    this._messenger = new Messenger();
    this._connection = this._messenger.initConnection(
      PORT_TYPES.inline_style_observer,
      this.handleMessage
    );
    this.oldStylesheet = null;
    this.newStylesheet = null;
    this._observer = new InlineStyleObserver(this.handleChange);

    if (window.__styleurlSelectedElement) {
      this._observer.setSelectedElement(window.__styleurlSelectedElement);
    }

    window.__styleurlSetSelected = this._observer.setSelectedElement;
  }

  _sendMessage = message => {
    return this._connection.sendMessage(
      `background:${PORT_TYPES.inline_style_observer}`,
      message
    );
  };

  handleMessage = async (request, from, sender, sendResponse) => {
    const { kind } = request;

    if (kind === MESSAGE_TYPES.start_observing_inline_styles) {
      this._observer.start();
    } else if (kind === MESSAGE_TYPES.stop_observing_inline_styles) {
      this._observer.stop();
    } else if (kind === MESSAGE_TYPES.get_inline_style_diff) {
      sendResponse({
        kind: MESSAGE_TYPES.get_inline_style_diff,
        value: {
          old_stylesheet: this.oldStylesheet,
          new_stylesheet: this.newStylesheet
        }
      });
    }
  };

  handleChange = changes => {
    // So....theres no CSS file here -- because the styles are inline!
    // But, we're going to be exporting as a stylesheet, so we're just going to make it look like we're sending over a stylesheet

    const oldStylesheet = {
      url: "inline_style_edits.inline.css"
    };

    const newStylesheet = {
      url: "inline_style_edits.inline.css"
    };

    const oldRules = [];
    const newRules = [];

    // Ignore the ones we don't have a selector for...sorry.
    Object.values(changes)
      .filter(({ selector }) => !!selector)
      .forEach(change => {
        if (change.before) {
          oldRules.push(
            buildRuleFromSelectorAndCssText(change.selector, change.before)
          );
        } else {
          oldRules.push(buildRuleFromSelectorAndCssText(change.selector, ""));
        }

        if (change.after) {
          newRules.push(
            buildRuleFromSelectorAndCssText(change.selector, change.after)
          );
        } else {
          newRules.push(buildRuleFromSelectorAndCssText(change.selector, ""));
        }
      });

    oldStylesheet.content = oldRules.join("\n");
    newStylesheet.content = newRules.join("\n");

    newStylesheet.content;

    this.oldStylesheet = oldStylesheet;
    this.newStylesheet = newStylesheet;

    if (newStylesheet.content) {
      this._sendMessage({
        kind: MESSAGE_TYPES.style_diff_changed
      });
    }
  };
}
