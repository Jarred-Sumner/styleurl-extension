import React from "react";
import "./HeaderBar.css";
import WhiteTextLogo from "./WhiteTextLogo";
import classNames from "classnames";
import { Icon } from "./Icon";
import FeedbackForm from "./FeedbackForm";

export class HeaderBar extends React.Component {
  static defaultProps = {
    hidden: false
  };

  render() {
    const {
      hidden,
      onHide,
      center,
      className,
      children,
      onSendFeedback
    } = this.props;
    return (
      <header
        className={classNames("HeaderBar", className, {
          "HeaderBar--hidden": hidden
        })}
      >
        <div className="HeaderSide HeaderSide--left">
          <div onClick={onHide} className="HeaderBar-hideButton">
            <Icon height="20" name="close" />
          </div>
          <WhiteTextLogo className="HeaderBar--logo" />
          <FeedbackForm onSendFeedback={onSendFeedback} />
        </div>

        <div className="HeaderSide HeaderSide--center">{center}</div>

        <div className="HeaderSide HeaderSide--right">{children}</div>
      </header>
    );
  }
}

export default HeaderBar;
