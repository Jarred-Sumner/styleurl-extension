import React from "react";
import "./HeaderBar.css";
import WhiteTextLogo from "./WhiteTextLogo";
import classNames from "classnames";

export class HeaderBar extends React.Component {
  static defaultProps = {
    hidden: false
  };

  render() {
    const { hidden, center, children } = this.props;
    return (
      <header
        className={classNames("HeaderBar", {
          "Header--hidden": hidden
        })}
      >
        <div className="HeaderSide HeaderSide--left">
          <WhiteTextLogo />
        </div>

        <div className="HeaderSide HeaderSide--center">{center}</div>

        <div className="HeaderSide HeaderSide--right">{children}</div>
      </header>
    );
  }
}

export default HeaderBar;
