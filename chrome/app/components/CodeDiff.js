import React from "react";
import "./CodeDiff.css";
import SyntaxHighlighter from "react-syntax-highlighter";
import { monokai } from "react-syntax-highlighter/styles/hljs";
import filenameify from "filenamify";

const normalizeFilename = filename => {
  if (!filename.endsWith(".css")) {
    return filenameify(filename + ".css");
  } else {
    return filenameify(filename);
  }
};

export const concatStylesheets = (stylesheets, includeURL = false) => {
  const code = stylesheets
    .map(
      stylesheet =>
        `/* ${normalizeFilename(stylesheet[0])} */\n\n${stylesheet[1]}`
    )
    .join("\n\n");

  if (includeURL) {
    return (
      `/* Page: ${
        window.location.href
      } */\n/* Exported via StyleURL (https://www.styleurl.app) */\n` + code
    );
  } else {
    return code;
  }
};

export default class CodeDiff extends React.PureComponent {
  state = {
    code: "",
    stylesheets: []
  };

  static getDerivedStateFromProps(props, state) {
    if (props.stylesheets !== state.stylesheets) {
      return {
        code: concatStylesheets(props.stylesheets),
        stylesheets: props.stylesheets.slice()
      };
    } else {
      return {};
    }
  }

  render() {
    return (
      <div className="CodeDiff">
        <SyntaxHighlighter
          showLineNumbers
          customStyle={{
            background: "#21262F"
          }}
          language="css"
          style={monokai}
        >
          {this.state.code}
        </SyntaxHighlighter>
      </div>
    );
  }
}
