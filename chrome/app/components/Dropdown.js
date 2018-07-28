import React from "react";
import "./Dropdown.css";
import classNames from "classnames";
import onClickOutside from "react-onclickoutside";

class _DropdownChild extends React.Component {
  handleClickOutside = evt => this.props.hide(evt);
  handleClick = evt => evt.stopPropagation();

  render() {
    const { children, ...otherProps } = this.props;

    return (
      <div onClick={this.handleClick} className="Dropdown-child">
        {children}
      </div>
    );
  }
}

const DropdownChild = onClickOutside(_DropdownChild, {
  excludeScrollbar: true
});

class Dropdown extends React.Component {
  state = {
    isOpen: false
  };

  handleToggleOpen = evt => {
    if (this.props.onClick) {
      this.props.onClick();
    } else if (this.props.children) {
      const isOpen = !this.state.isOpen;
      this.setState({ isOpen });
      if (this.props.onToggle) {
        this.props.onToggle(isOpen);
      }
    }
  };
  // Do slight delay here as hack to account for previous button click
  handleClickOutside = evt => {
    if (this.state.isOpen) {
      this.setState({ isOpen: false });
    }
  };

  setDropdownRef = dropdownRef => (this.dropdownRef = dropdownRef);

  render() {
    const { icon, title, children } = this.props;
    const { isOpen } = this.state;

    return (
      <div
        ref={this.setDropdownRef}
        className={classNames("Dropdown", "ignore-react-onclickoutside", {
          "Dropdown--open": !!this.state.isOpen,
          "Dropdown--closed": !this.state.isOpen
        })}
      >
        <div onClick={this.handleToggleOpen} className="Dropdown-content">
          {icon && <div className="Dropdown-icon">{icon}</div>}
          {title && <div className="Dropdown-title">{title}</div>}
        </div>

        {isOpen ? (
          <DropdownChild hide={this.handleClickOutside}>
            {children}
          </DropdownChild>
        ) : null}
      </div>
    );
  }
}

export default Dropdown;
