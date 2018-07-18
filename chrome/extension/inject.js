import React, { Component } from "react";
import { render } from "react-dom";
import Dock from "react-dock";
import { MESSAGE_TYPES, INITIAL_WIDTH } from "./create_styleurl/messages";

class InjectApp extends Component {
  constructor(props) {
    super(props);
    this.state = { isVisible: true };
  }

  setIframe = iframe => (this.iframeRef = iframe);

  handleSizeChange = size => {
    if (!this.iframeRef) {
      return true;
    }

    window.postMessage(
      {
        name: MESSAGE_TYPES.size_change,
        size
      },
      "*"
    );

    return true;
  };

  render() {
    return (
      <Dock
        position="top"
        dimMode="none"
        defaultSize={INITIAL_WIDTH}
        fluid={false}
        onSizeChange={this.handleSizeChange}
        isVisible={this.state.isVisible}
      >
        <iframe
          ref={this.setIframe}
          style={{
            width: "100%",
            height: "100%"
          }}
          frameBorder={0}
          allowTransparency="true"
          src={chrome.extension.getURL(`create_styleurl.html`)}
        />
      </Dock>
    );
  }
}

const injectDOM = document.createElement("div");
injectDOM.className = "inject-react-example";
injectDOM.style.textAlign = "center";
document.body.appendChild(injectDOM);
render(<InjectApp />, injectDOM);
