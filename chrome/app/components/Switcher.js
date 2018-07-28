import React from "react";
import classNames from "classnames";
import "./Switcher.css";

export class Switcher extends React.PureComponent {
  handleToggle = () => this.props.onChange(!this.props.on);

  render() {
    const { onLabel, offLabel, on } = this.props;
    return (
      <div
        onClick={this.handleToggle}
        className={classNames("Switcher", {
          "Switcher--on": !!on,
          "Switcher--off": !on
        })}
      >
        <div className="SwitcherSide SwitcherSide--on">
          <div className="SwitcherSide-label">{onLabel}</div>
        </div>

        <div className="SwitcherSide SwitcherSide--off">
          <div className="SwitcherSide-label">{offLabel}</div>
        </div>
      </div>
    );
  }
}

export default Switcher;
