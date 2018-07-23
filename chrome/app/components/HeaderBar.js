import React from "react";
import "./HeaderBar.css";
import WhiteTextLogo from "./WhiteTextLogo";
import classNames from "classnames";
import { Icon } from "./Icon";

export class HeaderBar extends React.Component {
  static defaultProps = {
    hidden: false
  };

  render() {
    const { hidden, onHide, center, children } = this.props;
    return (
      <header
        className={classNames("HeaderBar", {
          "HeaderBar--hidden": hidden
        })}
      >
        <div className="HeaderSide HeaderSide--left">
          <div onClick={onHide} className="HeaderBar-hideButton">
            <Icon height="20" name="close" />
          </div>
          <WhiteTextLogo />
        </div>

        <div className="HeaderSide HeaderSide--center">{center}</div>

        <div className="HeaderSide HeaderSide--right">{children}</div>
      </header>
    );
  }
}

export default HeaderBar;
