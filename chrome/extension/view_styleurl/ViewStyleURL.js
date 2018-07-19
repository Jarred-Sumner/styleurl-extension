import React from "react";
import Messenger from "chrome-ext-messenger";

import { INITIAL_WIDTH } from "./messages";
import { HeaderBar } from "app/components/HeaderBar";
import { PORT_TYPES, MESSAGE_TYPES } from "../lib/port";
import { Button } from "app/components/Button";
import { BUTTON_COLORS } from "../../app/components/Button";

const messenger = new Messenger();

const buildEditURL = gistId => {
  return `${__API_HOST__}/api/gists/edit/${gistId}`;
};

const buildViewURL = gistId => {
  return `https://gist.github.com/${gistId}`;
};

const copyToClipboard = text => {
  const input = document.createElement("input");
  document.body.appendChild(input);
  input.value = text;
  input.focus();
  input.style.visibility = "hidden";
  input.select();
  const result = document.execCommand("copy");

  if (result === "unsuccessful") {
    console.error("Failed to copy text.");
  }

  document.body.removeChild(input);

  return result !== "unsuccessful";
};

const EXAMPLE_STYLEFILE = {
  version: 1,
  name: "Jarred's github.com changes",
  domains: ["github.com"],
  url_patterns: ["github.com/*"],
  timestamp: "2018-07-15T03:24:29Z",
  id: "vHxq",
  redirect_url: "https://github.com/Jarred-Sumner/styleurl-extension",
  shared_via:
    "StyleURL – import and export CSS changes from Chrome Inspector to a Gist\nyou can share (like this one!)"
};

class PopupRoot extends React.Component {
  static defaultProps = {
    stylefile: EXAMPLE_STYLEFILE,
    gistId: "4197f93e0fc62d7cf235d41eef5a7fa3"
  };

  constructor(props) {
    super(props);

    this.state = {
      width: INITIAL_WIDTH
    };

    this._connection = messenger.initConnection(
      PORT_TYPES.inline_header,
      this.handleMessage
    );
  }

  handleMessage = async (request, from, sender, sendResponse) => {
    console.log("MESSAGE", request);
  };

  componentWillUnmount() {
    if (this._connection) {
      this._connection.disconnect();
    }
  }

  handleChange = () => {
    console.log("change");
  };

  _sendMessage = message => {
    return this._connection.sendMessage(
      `background:${PORT_TYPES.inline_header}`,
      message
    );
  };

  handleExport = () => {
    this._sendMessage({
      type: MESSAGE_TYPES.create_style_url,
      value: {
        visibility: "private"
      }
    });
  };

  handleShareChanges = () => {
    return this._sendMessage({
      type: MESSAGE_TYPES.create_style_url,
      value: {
        visibility: "public"
      }
    }).then(response => {
      if (
        response &&
        response.success &&
        response.data.visibility === "publicly_visible"
      ) {
        const shareURL = response.data.share_url;
        const didCopy = copyToClipboard(shareURL);

        return this._sendMessage({
          type: MESSAGE_TYPES.send_success_notification,
          value: {
            didCopy
          }
        });
      }
    });
  };

  render() {
    const { stylefile, gistId } = this.props;
    return (
      <HeaderBar>
        <Button onClick={this.handleExport}>Export changes</Button>
        <Button onClick={this.handleShareChanges} color={BUTTON_COLORS.blue}>
          Share changes
        </Button>
      </HeaderBar>
    );
  }
}

export default PopupRoot;
