import React from "react";
import "./Icon.css";

const FeedbackIcon = ({ width, height, ...otherProps }) => (
  <svg width={width} height={height} {...otherProps} viewBox="0 0 22 22">
    <path
      d="M0 1v19.753a1 1 0 0 0 1.67.743l3.301-2.974H21a1 1 0 0 0 1-1V1a1 1 0 0 0-1-1H1a1 1 0 0 0-1 1zm5.891 3.14h4.19a.92.92 0 1 1 0 1.84H5.89a.92.92 0 1 1 0-1.84zm-.92 9.592a.92.92 0 0 1 .92-.92h8.14a.92.92 0 1 1 0 1.84h-8.14a.92.92 0 0 1-.92-.92zm11.138-3.416H5.891a.92.92 0 0 1 0-1.84H16.11a.92.92 0 1 1 0 1.84z"
      fillRule="nonzero"
      className="IconFill"
    />
  </svg>
);

const ExportIcon = ({ width, height, ...otherProps }) => (
  <svg width={width} height={height} viewBox="0 0 37 36">
    <g className="IconFill" fillRule="evenodd">
      <path d="M25.542 13.014v4h6.96v14.899H4.003v-14.9h6.96v-4H.003v22.9h36.499v-22.9z" />
      <path d="M16.252 7.834v19.41h4V7.568l2.694 2.694 2.828-2.828-7.388-7.39L10.73 7.7l2.828 2.828z" />
    </g>
  </svg>
);

const CodeIcon = ({ width, height, ...otherProps }) => (
  <svg {...otherProps} width={width} height={height} viewBox=" 0 0 32 20">
    <path
      d="M18.427.001c-.503.02-.933.359-1.059.833l-4.95 17.754c-.109.385.001.797.29 1.08.288.284.71.397 1.108.295.397-.1.708-.4.816-.785l4.95-17.755c.104-.345.03-.718-.2-1A1.157 1.157 0 0 0 18.428 0zM10.17 1.862a1.16 1.16 0 0 0-.595.243L.437 9.133c-.276.21-.437.532-.437.873 0 .34.161.662.437.872l9.138 7.028c.32.25.754.314 1.137.168.382-.146.655-.48.715-.875a1.1 1.1 0 0 0-.424-1.038l-8.008-6.15 8.008-6.16a1.09 1.09 0 0 0 .372-1.306 1.147 1.147 0 0 0-1.205-.683zm11.399 0a1.134 1.134 0 0 0-.982.806c-.126.439.037.907.41 1.183l8.008 6.16-8.008 6.15a1.1 1.1 0 0 0-.424 1.038c.06.395.333.729.715.875.383.146.816.082 1.137-.168l9.138-7.028c.276-.21.437-.532.437-.872 0-.34-.161-.663-.437-.873l-9.138-7.028c-.24-.19-.549-.278-.856-.243z"
      className="IconFill"
      fillRule="nonzero"
    />
  </svg>
);

const ForkIcon = ({ width, height, ...otherProps }) => (
  <svg {...otherProps} width={width} height={height} viewBox="0 0 20 26">
    <g className="IconFill IconStroke" fillRule="nonzero">
      <path d="M3.832 6.84h1.032v9.307H3.832z" />
      <path d="M4.335 7.347c-1.694 0-3.097-1.387-3.097-3.12a3.09 3.09 0 0 1 3.097-3.094c1.694 0 3.097 1.387 3.097 3.12a3.09 3.09 0 0 1-3.097 3.094zm0-5.174a2.075 2.075 0 0 0-2.064 2.08c0 1.147.926 2.08 2.064 2.08A2.075 2.075 0 0 0 6.4 4.253c0-1.146-.926-2.08-2.065-2.08zM15.665 7.347c-1.694 0-3.097-1.387-3.097-3.12a3.09 3.09 0 0 1 3.097-3.094c1.694 0 3.097 1.387 3.097 3.12a3.09 3.09 0 0 1-3.097 3.094zm0-5.174a2.075 2.075 0 0 0-2.065 2.08c0 1.147.926 2.08 2.065 2.08a2.075 2.075 0 0 0 2.064-2.08c0-1.146-.926-2.08-2.064-2.08zM4.335 24.973c-1.694 0-3.097-1.386-3.097-3.12a3.096 3.096 0 0 1 3.097-3.12 3.096 3.096 0 0 1 3.097 3.12c0 1.734-1.403 3.12-3.097 3.12zm0-5.2a2.075 2.075 0 0 0-2.064 2.08c0 1.147.926 2.08 2.064 2.08a2.075 2.075 0 0 0 2.065-2.08c0-1.146-.926-2.08-2.065-2.08z" />
      <path d="M4.838 19.24H3.806v-3.093c0-2.587 2.065-4.667 4.632-4.667h3.097c1.986 0 3.6-1.627 3.6-3.627V6.84h1.033v1.013c0 2.587-2.065 4.667-4.633 4.667h-3.07c-1.986 0-3.6 1.627-3.6 3.627l-.027 3.093z" />
    </g>
  </svg>
);

const ShareIcon = ({ width, height, ...otherProps }) => (
  <svg {...otherProps} viewBox="0 0 24 21" width={width} height={height}>
    <path
      d="M23.61 7.399L15.36.274c-.722-.623-1.86-.117-1.86.852v3.752C5.97 4.964 0 6.473 0 13.61c0 2.88 1.855 5.733 3.906 7.225.64.465 1.552-.119 1.316-.873-2.125-6.798 1.008-8.602 8.278-8.707v4.121c0 .97 1.14 1.474 1.86.851l8.25-7.125a1.125 1.125 0 0 0 0-1.702z"
      className="IconFill"
      fillRule="nonzero"
    />
  </svg>
);

const CloseIcon = ({ width, height, ...otherProps }) => (
  <svg {...otherProps} width={width} height={height} viewBox="0 0 100 100">
    <path
      className="IconFill"
      d="M72.9 11.5L50 34.4 27.1 11.5c-2.9-2.9-7.7-2.9-10.6 0l-4.2 4.2c-2.9 2.9-2.9 7.7 0 10.6l22.9 22.9-23 23c-2.9 2.9-2.9 7.7 0 10.6l4.2 4.2c2.9 2.9 7.7 2.9 10.6 0l23-22.9L72.9 87c2.9 2.9 7.7 2.9 10.6 0l4.2-4.2c2.9-2.9 2.9-7.7 0-10.6L64.8 49.3l22.9-22.9c2.9-2.9 2.9-7.7 0-10.6l-4.2-4.2c-2.9-3-7.6-3-10.6-.1z"
    />
  </svg>
);

const ICON_BY_NAME = {
  fork: ForkIcon,
  close: CloseIcon,
  code: CodeIcon,
  share: ShareIcon,
  export: ExportIcon,
  feedback: FeedbackIcon
};

export const Icon = ({ width, height, color, name, ...otherProps }) => {
  const IconComponent = ICON_BY_NAME[name];

  return (
    <IconComponent
      style={color ? { color } : undefined}
      {...otherProps}
      width={width}
      height={height}
    />
  );
};

export default Icon;
