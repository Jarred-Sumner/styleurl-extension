import React from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { monokai } from "react-syntax-highlighter/styles/hljs";
import { Button, BUTTON_COLORS } from "./Button";
import "./StylesheetCodePreview.css";

const buildViewURL = gistId => {
  return `https://gist.github.com/${gistId}`;
};

const concatStylesheets = stylesheets =>
  stylesheets
    .map(stylesheet => `/* ${stylesheet[0]} */\n\n${stylesheet[1]}`)
    .join("\n\n");

export class StylesheetCodePreview extends React.PureComponent {
  state = {
    code: "",
    stylesheets: []
  };

  static getDerivedStateFromProps(props, state) {
    if (props.stylesheets !== state.stylesheets) {
      console.log(props.stylesheets);
      return {
        code: concatStylesheets(props.stylesheets),
        stylesheets: props.stylesheets.slice()
      };
    } else {
      return {};
    }
  }

  render() {
    const { gistId } = this.props;

    return (
      <div className="StylesheetCodePreview ignore-react-onclickoutside">
        <div className="CodeContainer">
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
        <div className="StylesheetCodePreview-Actions">
          <Button color={BUTTON_COLORS.black} href={buildViewURL(gistId)}>
            Open gist
          </Button>
        </div>
      </div>
    );
  }
}

export default StylesheetCodePreview;
