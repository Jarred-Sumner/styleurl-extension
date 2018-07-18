import React from "react";
import { Gist } from "./Gist";

import { INITIAL_WIDTH, MESSAGE_TYPES } from "./messages";

const buildEditURL = gistId => {
  return `${__API_HOST__}/api/gists/edit/${gistId}`;
};

const buildViewURL = gistId => {
  return `https://gist.github.com/${gistId}`;
};

const EXAMPLE_STYLEFILE = {
  version: 1,
  name: "Jarred's github.com changes",
  domains: ["github.com"],
  url_patterns: ["github.com/*"],
  timestamp: "2018-07-15T03:24:29Z",
  id: "vHxq",
  redirect_url: "https://github.com/Jarred-Sumner/styleurl-extension",
  shared_via:
    "StyleURL – import and export CSS changes from Chrome Inspector to a Gist\nyou can share (like this one!)"
};

class PopupRoot extends React.Component {
  static defaultProps = {
    stylefile: EXAMPLE_STYLEFILE,
    gistId: "4197f93e0fc62d7cf235d41eef5a7fa3"
  };

  constructor(props) {
    super(props);

    this.state = {
      width: INITIAL_WIDTH
    };

    window.addEventListener(
      "message",
      event => {
        console.log("MSG", event.data);
        if (
          event.data &&
          event.data.name === MESSAGE_TYPES.size_change &&
          event.data.size
        ) {
          console.log(event.data.size);
        }
      },
      false
    );
  }

  handleChange = () => {
    console.log("change");
  };

  render() {
    const { stylefile, gistId } = this.props;
    return (
      <div className="Popup">
        <div className="Header">
          <div className="Header--left">
            <svg
              className="Header-logo"
              width="18px"
              height="18px"
              viewBox="0 0 130 130"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g
                  transform="translate(-67.000000, -397.000000)"
                  stroke="#29F6BC"
                >
                  <g transform="translate(68.000000, 398.000000)">
                    <g>
                      <circle
                        strokeWidth="2"
                        fill="#333333"
                        cx="64"
                        cy="64"
                        r="64"
                      />
                      <path
                        d="M39.3846154,73.5096154 L47.8942308,73.5096154 C48.2788481,75.9134736 48.8317272,78.2211428 49.5528846,80.4326923 C50.2740421,82.6442418 51.2115327,84.5672995 52.3653846,86.2019231 C53.5192365,87.8365466 54.9374916,89.1586488 56.6201923,90.1682692 C58.302893,91.1778897 60.2980654,91.6826923 62.6057692,91.6826923 C66.7404053,91.6826923 69.5528772,90.7211635 71.0432692,88.7980769 C72.5336613,86.8749904 73.2788462,84.663474 73.2788462,82.1634615 C73.2788462,80.1442207 72.9423111,78.4134687 72.2692308,76.9711538 C71.5961505,75.5288389 70.6346216,74.2548132 69.3846154,73.1490385 C68.1346091,72.0432637 66.6682776,71.0336584 64.9855769,70.1201923 C63.3028762,69.2067262 61.4519332,68.1730827 59.4326923,67.0192308 C53.9518957,64.2307553 49.4567483,61.153863 45.9471154,57.7884615 C42.4374825,54.4230601 40.6826923,50.2404096 40.6826923,45.2403846 C40.6826923,42.6442178 41.2355714,40.1202046 42.3413462,37.6682692 C43.4471209,35.2163339 45.0576817,33.0288558 47.1730769,31.1057692 C49.2884721,29.1826827 51.8846,27.6201983 54.9615385,26.4182692 C58.0384769,25.2163401 61.4999808,24.6153846 65.3461538,24.6153846 C68.4230923,24.6153846 71.4759464,24.9999962 74.5048077,25.7692308 C77.533669,26.5384654 80.8269053,27.8846058 84.3846154,29.8076923 L85.3942308,47.4038462 L77.3173077,47.4038462 C76.5480731,41.8268952 75.0577034,37.9327034 72.8461538,35.7211538 C70.6346043,33.5096043 67.7019413,32.4038462 64.0480769,32.4038462 C61.2596014,32.4038462 58.8557793,33.149031 56.8365385,34.6394231 C54.8172976,36.1298151 53.8076923,38.2692168 53.8076923,41.0576923 C53.8076923,43.0769332 54.2884567,44.8076851 55.25,46.25 C56.2115433,47.6923149 57.485569,49.0144171 59.0721154,50.2163462 C60.6586618,51.4182752 62.4615284,52.5480716 64.4807692,53.6057692 C66.5000101,54.6634668 68.6153736,55.7211486 70.8269231,56.7788462 C72.9423183,57.7403894 75.0576817,58.7499947 77.1730769,59.8076923 C79.2884721,60.8653899 81.1874916,62.1634538 82.8701923,63.7019231 C84.552893,65.2403923 85.9230716,67.0913353 86.9807692,69.2548077 C88.0384668,71.41828 88.5673077,74.0865226 88.5673077,77.2596154 C88.5673077,79.9519365 88.0384668,82.6201791 86.9807692,85.2644231 C85.9230716,87.9086671 84.2884726,90.2644127 82.0769231,92.3317308 C79.8653736,94.3990488 77.0769399,96.0576861 73.7115385,97.3076923 C70.346137,98.5576986 66.3077159,99.1826923 61.5961538,99.1826923 C58.1345981,99.1826923 54.6730942,98.7019279 51.2115385,97.7403846 C47.7499827,96.7788413 44.5288611,95.3365481 41.5480769,93.4134615 L39.3846154,73.5096154 Z"
                        id="logo"
                        fill="#29F6BC"
                      />
                    </g>
                  </g>
                </g>
              </g>
            </svg>
            <h3 className="Header-title">
              <a target="_blank" href={buildViewURL(gistId)}>
                {stylefile.name}
              </a>
            </h3>
          </div>

          <div className="Header--right">
            <svg
              className="Header-closeButton CloseButton"
              width={18}
              height={18}
              viewBox="0 0 100 100"
            >
              <path d="M50 5.1c-24.9 0-45 20.1-45 45s20.1 45 45 45 45-20.1 45-45-20.1-45-45-45zM68.8 61c1.7 1.7 1.7 4.4 0 6.1L67 68.9c-1.7 1.7-4.4 1.7-6.1 0L50 58.1 39.1 68.9c-1.7 1.7-4.4 1.7-6.1 0L31.1 67c-1.7-1.7-1.7-4.4 0-6.1L42 50.1 31.2 39.2c-1.7-1.7-1.7-4.4 0-6.1l1.9-1.9c1.7-1.7 4.4-1.7 6.1 0L50 42.1l10.9-10.9c1.7-1.7 4.4-1.7 6.1 0l1.9 1.9c1.7 1.7 1.7 4.4 0 6.1L58 50.1 68.8 61z" />
            </svg>
          </div>
        </div>

        <div className="EditorToolbar">
          <div className="ToggleButtonGroup">
            <div className="ToggleButton">
              <div className="ToggleButton-icon">
                <svg width={14} height={14} fill="#FFF" viewBox="0 0 96 96">
                  <path d="M25.824 92.764l4.41-.1 1.602-3.93.836.33 1.691-4.279c2.672-6.766 12.961-10.883 12.961-10.883s.678.293.744.121c.061-.15.275-.789.275-.789 2.684-7.598 20.734-58.678 21.605-61.359.939-2.902-1.346-3.328-1.346-3.328l-2.281-.9-.336-.131-3.75-1.482-3.75-1.48-.335-.134-2.283-.9s-1.959-1.252-3.256 1.51C51.414 7.583 29.697 57.221 26.47 64.596c0 .004-.199.414-.34.766-.066.172.627.418.627.418s4.703 10.039 2.029 16.805L27.1 86.863l.516.205-1.756 4.443-.036 1.253z" />
                </svg>
              </div>
              <div className="ToggleButton-text">Highlight diff</div>
            </div>
          </div>

          <div className="ToggleButtonGroup">
            <div className="ToggleButton">
              <div className="ToggleButton-icon">
                <svg width={14} height={14} fill="#FFF" viewBox="0 0 32 32">
                  <path d="M6 25h8v2H6zm10-12H6v2h10zm4 6v-4l-6 6 6 6v-4h10v-4zm-9-2H6v2h5zm-5 6h5v-2H6zm18 2h2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6a4 4 0 0 1 8 0h6a2 2 0 0 1 2 2v10h-2v-6H4v18h20zM6 9h16a2 2 0 0 0-2-2h-2a2 2 0 0 1-2-2 2 2 0 0 0-4 0 2 2 0 0 1-2 2H8a2 2 0 0 0-2 2z" />
                </svg>
              </div>
              <div className="ToggleButton-text">Copy</div>
            </div>

            <div className="ToggleButton">
              <div className="ToggleButton-icon">
                <svg
                  height="14"
                  width="14"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 100 100"
                >
                  <g>
                    <path
                      fill="#FFF"
                      d="M32.7,46.7c-1.8,1.8-1.8,4.8,0,6.6l14.2,14.1c0.9,0.9,2.1,1.4,3.3,1.4c1.2,0,2.4-0.5,3.3-1.4l13.9-14.1   c1.8-1.8,1.8-4.8,0-6.6c-1.8-1.8-4.8-1.8-6.6,0l-6.1,6.2v-5.3V14.8c0-1.3-1-2.3-2.3-2.3h-4.7c-1.3,0-2.3,1-2.3,2.3v32.8v4.6   l-0.6-0.1l-5.5-5.4C37.5,44.9,34.5,44.9,32.7,46.7z"
                    />
                    <path
                      fill="#FFF"
                      d="M82.9,21.9H68.8c-2.6,0-4.6,2.1-4.6,4.6v0.1c0,2.6,2.1,4.6,4.6,4.6h7.1c1.3,0,2.3,1,2.3,2.3v42.2   c0,1.3-1,2.3-2.3,2.3H50H24.3c-1.3,0-2.3-1-2.3-2.3V33.6c0-1.3,1-2.3,2.3-2.3h7.1c2.6,0,4.6-2.1,4.6-4.6v-0.1   c0-2.6-2.1-4.6-4.6-4.6H17.2c-2.6,0-4.7,2.1-4.7,4.7v56.3c0,2.6,2.1,4.7,4.7,4.7H50h32.8c2.6,0,4.7-2.1,4.7-4.7V26.6   C87.6,24,85.5,21.9,82.9,21.9z"
                    />
                  </g>
                </svg>
              </div>
              <div className="ToggleButton-text">Download</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default PopupRoot;
