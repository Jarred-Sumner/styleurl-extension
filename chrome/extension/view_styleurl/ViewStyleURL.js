import React from "react";
import Messenger from "chrome-ext-messenger";
import { HeaderBar } from "app/components/HeaderBar";
import { PORT_TYPES, MESSAGE_TYPES } from "../lib/port";
import { Switcher } from "../../app/components/Switcher";
import { Dropdown } from "../../app/components/Dropdown";

const messenger = new Messenger();

class ViewStyleURL extends React.PureComponent {
  render() {
    const {
      toggleApplyStyle,
      toggleIsBarEnabled,
      isStyleEnabled,
      isBarEnabled
    } = this.props;

    return (
      <HeaderBar
        hidden={!isBarEnabled}
        center={
          <Switcher
            onLabel="New changes"
            offLabel="Original"
            on={isStyleEnabled}
            onChange={toggleApplyStyle}
          />
        }
      >
        <Dropdown title="Fork" />
        <Dropdown title="Code" />
        <Dropdown title="Share" />
      </HeaderBar>
    );
  }
}

class ViewStyleURLContainer extends React.Component {
  constructor(props) {
    super(props);

    this._connection = messenger.initConnection(
      PORT_TYPES.inline_header,
      this.handleMessage
    );

    this.state = {
      styleurl: null,
      isBarEnabled: false,
      isStyleEnabled: false
    };
  }

  componentDidMount() {
    this._sendMessage(MESSAGE_TYPES.get_styleurl).then(this.updateStyleURL);
  }

  updateStyleURL = styleurl =>
    this.setState({
      styleurl,
      isBarEnabled: styleurl.isBarEnabled,
      isStyleEnabled: styleurl.isStyleEnabled
    });

  _sendMessage = (type, message) => {
    return this._connection.sendMessage(
      `background:${PORT_TYPES.inline_header}`,
      {
        type,
        value: message
      }
    );
  };

  toggleBarEnabled = () => {
    this._sendMessage(MESSAGE_TYPES.update_styleurl_state, {
      ...this.state.styleurl,
      isBarEnabled: !this.state.isBarEnabled
    });
  };

  toggleApplyStyle = () => {
    this._sendMessage(MESSAGE_TYPES.update_styleurl_state, {
      ...this.state.styleurl,
      isStyleEnabled: !this.state.isStyleEnabled
    });
  };

  handleMessage = (request, from, sender, sendResponse) => {
    const { type, value } = request;

    if (type === MESSAGE_TYPES.get_styleurl) {
      this.updateStyleURL(value);
    }
  };

  componentWillUnmount() {
    if (this._connection) {
      this._connection.disconnect();
    }
  }

  render() {
    const { isStyleEnabled, isBarEnabled } = this.state;

    return (
      <ViewStyleURL
        isStyleEnabled={isStyleEnabled}
        isBarEnabled={isBarEnabled}
        toggleApplyStyle={this.toggleApplyStyle}
      />
    );
  }
}

export default ViewStyleURLContainer;
