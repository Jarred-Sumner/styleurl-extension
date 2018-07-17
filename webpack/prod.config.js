const path = require("path");
const webpack = require("webpack");
const autoprefixer = require("autoprefixer");

const customPath = path.join(__dirname, "./customPublicPath");

module.exports = {
  node: {
    dns: "empty",
    net: "empty"
  },
  entry: {
    popup: [customPath, path.join(__dirname, "../chrome/extension/popup")],
    background: [
      customPath,
      path.join(__dirname, "../chrome/extension/background")
    ],
    devtools: [
      customPath,
      path.join(__dirname, "../chrome/extension/devtools")
    ],
    github_gist_content_script: [
      customPath,
      path.join(__dirname, "../chrome/extension/github_gist_content_script")
    ]
  },
  output: {
    path: path.join(__dirname, "../build"),
    filename: "[name].bundle.js",
    chunkFilename: "[id].chunk.js"
  },
  optimization: {
    minimize: false
  },
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.IgnorePlugin(/[^/]+\/[\S]+.dev$/),
    new webpack.DefinePlugin({
      __API_HOST__: "`https://api.styleurl.app`",
      "process.env": {
        NODE_ENV: JSON.stringify("production")
      }
    })
  ],
  resolve: {
    extensions: ["*", ".js"],
    alias: {
      fs: "memfs"
    }
  },
  module: {
    rules: [
      {
        test: /\.ttf$/,
        use: {
          loader: "url-loader"
        }
      },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            plugins: ["@babel/plugin-proposal-class-properties"],
            presets: [
              "@babel/preset-react",
              [
                "@babel/preset-env",
                {
                  targets: {
                    browsers: ["chrome 66"]
                  }
                }
              ]
            ],
            babelrc: false
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          { loader: "css-loader", options: { importLoaders: 1 } },
          {
            loader: "postcss-loader"
          }
        ]
      }
    ]
  }
};
