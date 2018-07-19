import React from "react";
import "./Dropdown.css";
import classNames from "classnames";

export class Dropdown extends React.Component {
  state = {
    isOpen: false
  };

  handleToggleOpen = () => {
    if (this.props.onClick) {
      this.props.onClick();
    } else {
      this.setState({ isOpen: !this.state.isOpen });
    }
  };

  render() {
    const { icon, title, children } = this.props;
    const { isOpen } = this.state;

    return (
      <div
        className={classNames("Dropdown", {
          "Dropdown--open": !!this.state.isOpen,
          "Dropdown--closed": !this.state.isOpen
        })}
      >
        <div onClick={this.handleToggleOpen} className="Dropdown-content">
          {icon && <div className="Dropdown-icon">{icon}</div>}
          {title && <div className="Dropdown-title">{title}</div>}
        </div>

        {isOpen ? children : null}
      </div>
    );
  }
}

export default Dropdown;
