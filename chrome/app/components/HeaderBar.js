import React from "react";
import "./HeaderBar.css";
import WhiteTextLogo from "./WhiteTextLogo";

export class HeaderBar extends React.Component {
  render() {
    return (
      <header className="HeaderBar">
        <div className="HeaderSide HeaderSide--left">
          <WhiteTextLogo />
        </div>

        <div className="HeaderSide HeaderSide--center">{this.props.center}</div>

        <div className="HeaderSide HeaderSide--right">
          {this.props.children}
        </div>
      </header>
    );
  }
}

export default HeaderBar;
