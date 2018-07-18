import React from "react";
import "./gist.css";

const gistURL = ({ file, id }) => {
  const fileArg = file ? `?file=${file}` : "";

  return `https://gist.github.com/${id}.js${fileArg}`;
};

export class Gist extends React.Component {
  state = {
    url: null
  };

  static getDerivedStateFromProps(props, state) {
    const { id, file } = props;

    const url = gistURL({ id, file });

    if (url !== state.url) {
      return { url };
    } else {
      return {};
    }
  }

  componentDidUpdate(_prevProps, prevState) {
    if (this.state.url !== prevState.url) {
      this._updateIframeContent();
    }
  }

  componentDidMount() {
    this._updateIframeContent();
  }

  _updateIframeContent = () => {
    const { id, file, height } = this.props;

    const iframe = this.iframeNode;

    let doc = iframe.document;
    if (iframe.contentDocument) doc = iframe.contentDocument;
    else if (iframe.contentWindow) doc = iframe.contentWindow.document;

    const gistLink = this.state.url;
    const gistScript = `<script type="text/javascript" src="${gistLink}"></script>`;
    const stylesheetHref = document.querySelector("#root_stylesheet").href;
    const styles = `<link rel="stylesheet" href="${stylesheetHref}" />`;
    const elementId = file ? `gist-${id}-${file}` : `gist-${id}`;

    const resizeScript = `onload="parent.document.getElementById('${elementId}').style.height=document.body.scrollHeight + 'px'"`;
    const iframeHtml = `<html id="gist_root"><head><base target="_blank">${styles}</head><body ${resizeScript}>${gistScript}</body></html>`;

    doc.open();
    doc.writeln(iframeHtml);
    doc.close();
  };

  render() {
    const { id, file, height, width } = this.props;

    return (
      <iframe
        ref={n => {
          this.iframeNode = n;
        }}
        width="600"
        height={400}
        frameBorder={0}
        id={file ? `gist-${id}-${file}` : `gist-${id}`}
      />
    );
  }
}

export default Gist;
