import React from "react";
import Messenger from "chrome-ext-messenger";
import "../create_styleurl.css";
import { HeaderBar } from "app/components/HeaderBar";
import { PORT_TYPES, MESSAGE_TYPES } from "../lib/port";
import { Switcher } from "../../app/components/Switcher";
import Dropdown from "../../app/components/Dropdown";
import { Icon } from "../../app/components/Icon";
import { StylesheetCodePreview } from "../../app/components/StylesheetCodePreview";
import { CopyToClipboard } from "react-copy-to-clipboard";
import injectScriptNames from "../lib/injectScriptNames";
const messenger = new Messenger();

const buildShareURL = ({ domain, id }) => {
  return `${__FRONTEND_HOST__}/${domain}/${id}`;
};

const buildForkURL = ({ gistId }) => {
  return `${__API_HOST__}/api/fork?gist_id=${encodeURIComponent(gistId)}`;
};

class ViewStyleURL extends React.PureComponent {
  handleOpenFork = () => {
    const { gistId } = this.props;

    window.open(buildForkURL({ gistId }), "_blank");
  };

  render() {
    const {
      toggleApplyStyle,
      toggleIsBarEnabled,
      isStyleEnabled,
      isBarEnabled,
      gistId,
      hidden,
      onHide,
      stylesheets,
      onSendFeedback,
      onClickShare,
      shareURL
    } = this.props;

    return (
      <HeaderBar
        className="HeaderBar--ViewStyleURL"
        hidden={!isBarEnabled || hidden}
        onHide={onHide}
        onSendFeedback={onSendFeedback}
        center={
          <Switcher
            onLabel="New changes"
            offLabel="Original"
            on={isStyleEnabled}
            onChange={toggleApplyStyle}
          />
        }
      >
        <Dropdown
          icon={<Icon width={"32"} height="15" name="code" />}
          title="Code"
        >
          <StylesheetCodePreview gistId={gistId} stylesheets={stylesheets} />
        </Dropdown>
        <CopyToClipboard text={shareURL} onCopy={onClickShare}>
          <Dropdown
            icon={<Icon width={"24"} height="15" name="share" />}
            title="Share"
          />
        </CopyToClipboard>
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
      hidden: false,
      isStyleEnabled: false
    };
  }

  handleHide = () => {
    this.setState({ hidden: true });
    const shadowRoot = document.querySelector(
      `#${injectScriptNames.inject_view_styleurl}`
    );
    shadowRoot.style.display = "none";
  };

  componentDidMount() {
    this._sendMessage(MESSAGE_TYPES.get_styleurl).then(({ value }) =>
      this.updateStyleURL(value)
    );
  }

  updateStyleURL = styleurl =>
    this.setState({
      styleurl,
      isBarEnabled: styleurl.isBarEnabled,
      isStyleEnabled: styleurl.isStyleEnabled
    });

  _sendMessage = (kind, message) => {
    return this._connection.sendMessage(
      `background:${PORT_TYPES.inline_header}`,
      {
        kind,
        value: message
      }
    );
  };

  handleClickShare = () => {
    this._sendMessage(MESSAGE_TYPES.shared_styleurl);
  };

  toggleBarEnabled = () => {
    this._sendMessage(MESSAGE_TYPES.update_styleurl_state, {
      ...this.state.styleurl,
      isBarEnabled: !this.state.isBarEnabled
    });
  };
  handleSendFeedback = message => {
    return this._sendMessage(MESSAGE_TYPES.send_feedback, {
      message,
      from: "view"
    });
  };

  toggleApplyStyle = () => {
    this._sendMessage(MESSAGE_TYPES.update_styleurl_state, {
      ...this.state.styleurl,
      isStyleEnabled: !this.state.isStyleEnabled
    });
  };

  handleMessage = (request, from, sender, sendResponse) => {
    const { kind, value } = request;

    if (
      kind === MESSAGE_TYPES.get_styleurl ||
      kind === MESSAGE_TYPES.update_styleurl_state
    ) {
      this.updateStyleURL(value);
    }
  };

  componentWillUnmount() {
    if (this._connection) {
      this._connection.disconnect();
    }
  }

  render() {
    const { isStyleEnabled, isBarEnabled, hidden } = this.state;
    console.log(this.state.styleurl);

    return (
      <ViewStyleURL
        isStyleEnabled={isStyleEnabled}
        isBarEnabled={isBarEnabled}
        stylesheets={this.state.styleurl ? this.state.styleurl.stylesheets : []}
        gistId={this.state.styleurl ? this.state.styleurl.gistId : null}
        toggleApplyStyle={this.toggleApplyStyle}
        onClickShare={this.handleClickShare}
        onSendFeedback={this.handleSendFeedback}
        hidden={hidden}
        onHide={this.handleHide}
        shareURL={
          this.state.styleurl &&
          buildShareURL({
            domain: this.state.styleurl.stylefile.domains[0],
            id: this.state.styleurl.gistId
          })
        }
      />
    );
  }
}

export default ViewStyleURLContainer;
