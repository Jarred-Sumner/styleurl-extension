import { getSingleSelector } from "optimal-select";

export class InlineStyleObserver {
  constructor(onChange) {
    this.changeSet = {};
    this._observer = null;
    this.observing = false;

    this.onChange = onChange;
  }

  setSelectedElement = element => {
    const wasObserving = this.observing;
    if (wasObserving) {
      this.stop();
    }

    this.selectedElement = element;

    this.start();
  };

  start = () => {
    if (!this._observer) {
      this._observer = new MutationObserver(this.handleMutation);
    }

    if (this.observing || !this.selectedElement) {
      return;
    }

    this._observer.observe(this.selectedElement, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["style"]
    });

    this.observing = true;
  };

  stop = () => {
    if (!this.observing || !this._observer) {
      return;
    }

    this._observer.disconnect();
    this.observing = false;
  };

  handleMutation = mutations => {
    mutations.forEach(mutation => {
      if (mutation.attributeName !== "style") {
        return;
      }

      if (!mutation.target) {
        return;
      }

      const selector = getSingleSelector(mutation.target);

      if (!this.changeSet[selector]) {
        this.changeSet[selector] = {
          selector,
          before: mutation.oldValue,
          after: mutation.target.style.cssText
        };
      }

      this.changeSet[selector].after = mutation.target.style.cssText;
    });

    this.onChange(this.changeSet);
  };
}
