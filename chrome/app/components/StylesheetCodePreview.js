import React from "react";
import { Button, BUTTON_COLORS } from "./Button";
import "./StylesheetCodePreview.css";
import { getFilename } from "../../extension/create_styleurl/CreateStyleURL";
import CodeDiff, { concatStylesheets } from "./CodeDiff";

const buildViewURL = gistId => {
  return `https://gist.github.com/${gistId}`;
};

const buildDlUrl = stylesheets => {
  const blob = new Blob([concatStylesheets(stylesheets, true)], {
    type: "text/plain;charset=UTF-8"
  });
  return window.URL.createObjectURL(blob);
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
          <Button
            color={BUTTON_COLORS.black}
            href={buildDlUrl(stylesheets)}
            download={getFilename()}
          >
            Download
          </Button>
        </div>
      </div>
    );
  }
}

export default StylesheetCodePreview;
