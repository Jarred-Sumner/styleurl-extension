import React from "react";
import { Button, BUTTON_COLORS } from "./Button";
import "./StylesheetCodePreview.css";
import CodeDiff from "./CodeDiff";

const buildViewURL = gistId => {
  return `https://gist.github.com/${gistId}`;
};

export class StylesheetCodePreview extends React.PureComponent {
  render() {
    const { gistId, stylesheets } = this.props;
    return (
      <div className="StylesheetCodePreview ignore-react-onclickoutside">
        <CodeDiff stylesheets={stylesheets} />
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
