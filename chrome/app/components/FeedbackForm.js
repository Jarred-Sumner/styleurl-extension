import React from "react";
import { Icon } from "./Icon";
import onClickOutside from "react-onclickoutside";
import classNames from "classnames";
import { Button } from "./Button";
import "./FeedbackForm.css";

class FeedbackForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isExpanded: false,
      message: "",
      isSaving: false,
      hasSaved: false
    };
  }

  handleClickOutside = () => {
    if (this.state.isExpanded) {
      this.setState({ isExpanded: false });
    }
  };

  setExpanded = isExpanded => {
    this.setState({ isExpanded });
    if (isExpanded && this.inputRef) {
      this.inputRef.focus();
    }
  };
  handleCancel = () => this.setState({ isExpanded: false });
  handleSubmit = evt => {
    evt.preventDefault();
    this.props.onSendFeedback(this.state.message);
    this.setState({ message: "", isExpanded: false });
    alert("Thanks! Your feedback has been sent.");
  };

  disablePropagation = evt => {
    evt.stopPropagation();

    evt.nativeEvent.stopImmediatePropagation();
  };

  handleKeyDown = evt => {
    this.disablePropagation(evt);

    if (evt.keyCode === 27) {
      this.handleCancel();
    }
  };

  handleMessageChange = evt => this.setState({ message: evt.target.value });

  render() {
    const { isExpanded, message } = this.state;

    return (
      <div
        className="FeedbackFormContainer"
        onClick={() => this.setExpanded(true)}
      >
        <div
          className={classNames("FeedbackForm", {
            "FeedbackForm--expanded": isExpanded,
            "FeedbackForm--collapsed": !isExpanded
          })}
        >
          <div className="FeedbackForm-placeholder">
            <div className="Icon">
              <Icon
                width="14"
                height="14"
                name="feedback"
                size="16px"
                color="#B9BED1"
              />
            </div>

            <div className="FeedbackForm-title">
              Have feedback or questions?
            </div>
          </div>

          <form
            className="FeedbackForm-input"
            onClick={this.disablePropagation}
            onSubmit={this.handleSubmit}
          >
            <textarea
              required
              name="feedback"
              className="FeedbackInput"
              value={message}
              rows="3"
              ref={inputRef => (this.inputRef = inputRef)}
              placeholder="Have feedback or questions?"
              onKeyDown={this.handleKeyDown}
              onChange={this.handleMessageChange}
            />

            <div className="FeedbackForm-copy">
              Your feedback is sent directly to the founders.
            </div>

            <div className="FeedbackForm-inputButtons">
              <Button onClick={this.handleCancel} color="white">
                Cancel
              </Button>
              <Button onClick={this.handleSubmit} color="black">
                Send feedback
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

export default onClickOutside(FeedbackForm);
