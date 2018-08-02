import { HeaderBar } from "app/components/HeaderBar";
import Messenger from "chrome-ext-messenger";
import classNames from "classnames";
import filenameify from "filenamify";
import _ from "lodash";
import React from "react";
import CodeDiff, { concatStylesheets } from "../../app/components/CodeDiff";
import Dropdown from "../../app/components/Dropdown";
import { Icon } from "../../app/components/Icon";
import injectScriptNames from "../lib/injectScriptNames";
import { MESSAGE_TYPES, PORT_TYPES } from "../lib/port";
import { INITIAL_WIDTH } from "./messages";

const messenger = new Messenger();

export const getFilename = () => {
  // The plus here is just here so the VSCode syntax highlighter doesnt get messed up
  // Weird VSCode bug :shrug:
  return filenameify(`${location.pathname.substr(1)}.diff` + ".css", {
    replacement: "_"
  });
};

const buildEditURL = gistId => {
  return `${__API_HOST__}/api/gists/edit/${gistId}`;
};

function copyToClipboard(text) {
  const input = document.createElement("textarea");
  input.style.position = "fixed";
  input.style.opacity = 0;
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand("Copy");
  document.body.removeChild(input);
}

class CreateStyleURL extends React.PureComponent {
  state = {
    stylesheets: [],
    downloadURL: null
  };

  static getDerivedStateFromProps(props, state) {
    if (props.stylesheets !== state.stylesheets) {
      if (props.stylesheets) {
        const blob = new Blob([concatStylesheets(props.stylesheets, true)], {
          type: "text/plain;charset=UTF-8"
        });

        return {
          stylesheets: props.stylesheets,
          downloadURL: window.URL.createObjectURL(blob)
        };
      } else {
        if (state.downloadURL) {
          URL.revokeObjectURL(state.downloadURL);
        }

        return { stylesheets: [], downloadURL: null };
      }
    } else {
      return {};
    }
  }

  render() {
    const {
      onToggleDiff,
      onExport,
      onShareChanges,
      stylesheets,
      shareURL,
      setShareLinkRef,
      onSendFeedback,
      hidden,
      onHide
    } = this.props;

    return (
      <HeaderBar
        hidden={hidden}
        onHide={onHide}
        onSendFeedback={onSendFeedback}
        center={
          <input
            value={shareURL}
            readOnly
            ref={setShareLinkRef}
            className={classNames("ShareLink", {
              "ShareLink--shown": shareURL
            })}
          />
        }
      >
        <Dropdown
          onToggle={onToggleDiff}
          icon={<Icon width={"32"} height="15" name="code" />}
          title="View changes"
        >
          <div className="ViewChanges">
            <CodeDiff stylesheets={stylesheets} />
            <div className="ViewChanges-actions">
              <a
                href={this.state.downloadURL}
                download={getFilename()}
                className="ViewChanges-action"
              >
                <div className="ViewChanges-action-text">Download</div>
              </a>
              <div className="ViewChanges-separator" />
              <div onClick={onExport} className="ViewChanges-action">
                <div className="ViewChanges-action-text">Create Gist</div>
              </div>
            </div>
          </div>
        </Dropdown>
        <Dropdown
          onClick={onShareChanges}
          icon={<Icon width={"24"} height="15" name="share" />}
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
      shareURL: "",
      hidden: false,
      stylesheets: []
    };

    this._connection = messenger.initConnection(
      PORT_TYPES.inline_header,
      this.handleMessage
    );
  }

  handleMessage = async (request, from, sender, sendResponse) => {
    const kinds = MESSAGE_TYPES;
    const { kind = null } = request;
    if (kind === kinds.style_diff_changed) {
      this.syncStylesheets();
    } else if (kind === kinds.open_devtools_plz) {
      alert(
        "Please open Chrome Devtools and try again -- ⋮ -> More Tools -> Developer Tools"
      );
    }
  };

  componentWillUnmount() {
    if (this._connection) {
      this._connection.disconnect();
    }
  }

  syncStylesheets = () => {
    this._sendMessage({
      kind: MESSAGE_TYPES.get_current_styles_diff
    }).then(({ stylesheets }) => {
      this.setState({
        stylesheets: stylesheets.map(({ content, url }) => [
          _.last(url.split("/")),
          content
        ])
      });
      this.setVisible(!_.isEmpty(stylesheets));
    });
  };

  setShareLinkRef = shareLinkRef => (this.shareLinkRef = shareLinkRef);

  handleToggleDiff = isOpen => {
    if (isOpen) {
      this.syncStylesheets();
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
      kind: MESSAGE_TYPES.get_current_styles_diff,
      value: {
        devtools_required: true
      }
    });

    if (!stylesheets || !stylesheets.length) {
      alert("Please make some CSS changes and try again");
      return;
    }

    this._sendMessage({
      kind: MESSAGE_TYPES.upload_stylesheets,
      value: {
        stylesheets,
        visibility: "private"
      }
    }).then(response => {
      if (response && response.data && response.data.url) {
        window.open(response.data.url, "_blank");
      }
    });
  };

  handleSendFeedback = message => {
    return this._sendMessage({
      kind: MESSAGE_TYPES.send_feedback,
      value: {
        message,
        from: "create"
      }
    });
  };

  handleShareChanges = () => {
    return this._sendMessage({
      kind: MESSAGE_TYPES.get_current_styles_diff,
      value: {
        devtools_required: true
      }
    }).then(({ stylesheets }) => {
      if (!stylesheets || !stylesheets.length) {
        alert("Please make some CSS changes and try again");
        return;
      }

      this._sendMessage({
        kind: MESSAGE_TYPES.upload_stylesheets,
        value: {
          stylesheets,
          visibility: "public"
        }
      })
        .then(response => {
          if (
            response &&
            response.success &&
            response.data.visibility === "publicly_visible"
          ) {
            const shareURL = response.data.share_url;

            this.setState({ shareURL });
            window.open(response.data.url, "_blank");
            return shareURL;
          }

          return null;
        })
        .then(shareURL => {
          if (!shareURL) {
            return;
          }

          copyToClipboard(shareURL);

          this._sendMessage({
            kind: MESSAGE_TYPES.send_success_notification,
            value: {
              didCopy: true
            }
          });
        });
    });
  };

  setVisible = isVisible => {
    const hidden = !isVisible;
    if (hidden === this.state.hidden) {
      return;
    }

    this.setState({ hidden });

    const shadowRoot = document.querySelector(
      `#${injectScriptNames.inject_create_styleurl}`
    );

    if (hidden) {
      shadowRoot.style.opacity = 0;
      shadowRoot.style.pointerEvents = "none";
    } else {
      shadowRoot.style.opacity = 1;
      shadowRoot.style.pointerEvents = "auto";
    }
  };

  handleHideBar = () => this.setVisible(false);

  render() {
    return (
      <CreateStyleURL
        hidden={this.state.hidden}
        onExport={this.handleExport}
        onShareChanges={this.handleShareChanges}
        onHide={this.handleHideBar}
        stylesheets={this.state.stylesheets}
        onToggleDiff={this.handleToggleDiff}
        onSendFeedback={this.handleSendFeedback}
        setShareLinkRef={this.setShareLinkRef}
        shareURL={this.state.shareURL}
      />
    );
  }
}

export default CreateStyleURLContainer;
