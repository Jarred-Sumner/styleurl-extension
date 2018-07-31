import classNames from "classnames";
import React from "react";
import "./Button.css";

export const BUTTON_COLORS = {
  blue: "blue",
  black: "black",
  default: "default",
  white: "white"
};

export const BUTTON_SIZES = {
  default: "default"
};

export class Button extends React.Component {
  static defaultProps = {
    size: BUTTON_SIZES.default,
    color: BUTTON_COLORS.default
  };

  render() {
    const { children, color, size, icon, onClick, href, download } = this.props;

    const ComponentName = href ? "a" : "div";

    const child = (
      <React.Fragment>
        {!!icon && <div className="Button-icon">{icon}</div>}
        {!!children && <div className="Button-text">{children}</div>}
      </React.Fragment>
    );

    return React.createElement(
      ComponentName,
      {
        onClick,
        href,
        target: href ? "_blank" : undefined,
        className: classNames("Button", {
          "Button--color-blue": BUTTON_COLORS[color] === BUTTON_COLORS.blue,
          "Button--color-black": BUTTON_COLORS[color] === BUTTON_COLORS.black,
          "Button--color-white": BUTTON_COLORS[color] === BUTTON_COLORS.white,
          "Button--color-default":
            BUTTON_COLORS[color] === BUTTON_COLORS.default,
          "Button--size-default": BUTTON_COLORS[size] === BUTTON_SIZES.default
        }),
        download
      },
      child
    );
  }
}
