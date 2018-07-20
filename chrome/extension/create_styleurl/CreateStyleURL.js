import React from "react";
import Messenger from "chrome-ext-messenger";
import _ from "lodash";
import { INITIAL_WIDTH } from "./messages";
import { HeaderBar } from "app/components/HeaderBar";
import { PORT_TYPES, MESSAGE_TYPES } from "../lib/port";
import { Button } from "app/components/Button";
import { BUTTON_COLORS } from "../../app/components/Button";
import Dropdown from "../../app/components/Dropdown";
import { Icon } from "../../app/components/Icon";
import { StylesheetCodePreview } from "../../app/components/StylesheetCodePreview";

const messenger = new Messenger();

const buildEditURL = gistId => {
  return `${__API_HOST__}/api/gists/edit/${gistId}`;
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

class CreateStyleURL extends React.PureComponent {
  render() {
    const { onToggleDiff, onExport, onShareChanges, stylesheets } = this.props;
    return (
      <HeaderBar>
        <Dropdown
          onToggle={onToggleDiff}
          icon={<Icon width={"32"} height="20" name="code" />}
          title="Diff"
        >
          <StylesheetCodePreview stylesheets={stylesheets} />
        </Dropdown>
        <Dropdown
          onClick={onExport}
          icon={<Icon height="20" name="export" />}
          title="Export changes"
        />
        <Dropdown
          onClick={onShareChanges}
          icon={<Icon width={"24"} height="21" name="share" />}
          title="Share changes"
        />
      </HeaderBar>
    );
  }
}

class CreateStyleURLContainer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      width: INITIAL_WIDTH,
      stylesheets: []
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

  handleToggleDiff = isOpen => {
    if (isOpen) {
      this._sendMessage({
        kind: MESSAGE_TYPES.get_current_styles_diff
      }).then(({ stylesheets }) => {
        this.setState({
          stylesheets: stylesheets.map(({ content, url }) => [
            _.last(url.split("/")),
            content
          ])
        });
      });
    }
  };

  _sendMessage = message => {
    return this._connection.sendMessage(
      `background:${PORT_TYPES.inline_header}`,
      message
    );
  };

  handleExport = async () => {
    const { stylesheets } = await this._sendMessage({
      kind: MESSAGE_TYPES.get_current_styles_diff
    });

    this._sendMessage({
      kind: MESSAGE_TYPES.upload_stylesheets,
      value: {
        stylesheets,
        visibility: "private"
      }
    });
  };

  handleShareChanges = () => {
    return this._sendMessage({
      kind: MESSAGE_TYPES.get_current_styles_diff
    })
      .then(({ stylesheets }) =>
        this._sendMessage({
          kind: MESSAGE_TYPES.upload_stylesheets,
          value: {
            stylesheets,
            visibility: "public"
          }
        })
      )
      .then(response => {
        if (
          response &&
          response.success &&
          response.data.visibility === "publicly_visible"
        ) {
          const shareURL = response.data.share_url;
          const didCopy = copyToClipboard(shareURL);

          return this._sendMessage({
            kind: MESSAGE_TYPES.send_success_notification,
            value: {
              didCopy
            }
          });
        }
      });
  };

  render() {
    return (
      <CreateStyleURL
        onExport={this.handleExport}
        onShareChanges={this.handleShareChanges}
        stylesheets={this.state.stylesheets}
        onToggleDiff={this.handleToggleDiff}
      />
    );
  }
}

export default CreateStyleURLContainer;
