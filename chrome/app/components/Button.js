import classNames from "classnames";
import React from "react";
import "./Button.css";

export const BUTTON_COLORS = {
  blue: "blue",
  default: "default"
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
    const { children, color, size, icon, onClick } = this.props;

    return (
      <div
        onClick={onClick}
        className={classNames("Button", {
          "Button--color-blue": BUTTON_COLORS[color] === BUTTON_COLORS.blue,
          "Button--color-default":
            BUTTON_COLORS[color] === BUTTON_COLORS.default,
          "Button--size-default": BUTTON_COLORS[size] === BUTTON_SIZES.default
        })}
      >
        {!!icon && <div className="Button-icon">{icon}</div>}
        {!!children && <div className="Button-text">{children}</div>}
      </div>
    );
  }
}
