const path = require("path");
const webpack = require("webpack");
const autoprefixer = require("autoprefixer");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const UglifyJSPlugin = require("uglifyjs-webpack-plugin");

const customPath = path.join(__dirname, "./customPublicPath");

module.exports = {
  node: {
    dns: "empty",
    net: "empty"
  },
  entry: {
    css_manager_content_script: [
      customPath,
      path.join(__dirname, "../chrome/extension/css_manager_content_script")
    ],
    create_styleurl: [
      customPath,
      path.join(__dirname, "../chrome/extension/create_styleurl")
    ],
    view_styleurl: [
      customPath,
      path.join(__dirname, "../chrome/extension/create_styleurl")
    ],
    inject_create_styleurl: [
      customPath,
      path.join(__dirname, "../chrome/extension/inject_create_styleurl")
    ],
    inject_view_styleurl: [
      customPath,
      path.join(__dirname, "../chrome/extension/inject_view_styleurl")
    ],
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
    // I thought it was Chrome Store that disallows minification...but turns out it's Firefox.
    // https://developer.mozilla.org/en-US/Add-ons/AMO/Policy/Reviews#Source_Code_Submission
    minimizer: [
      new UglifyJSPlugin({
        sourceMap: true,
        uglifyOptions: {
          ecma: 8,
          compress: {
            ecma: 8
          },
          mangle: false,
          keep_classnames: true,
          keep_fnames: true,
          output: {
            ascii_only: true,
            beautify: true,
            ecma: 8
          }
        }
      })
    ],
    nodeEnv: "production"
  },
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.IgnorePlugin(/[^/]+\/[\S]+.dev$/),
    new webpack.DefinePlugin({
      __API_HOST__: "`https://api.styleurl.app`",
      __FRONTEND_HOST__: "`https://styleurl:app`",
      "process.env": {
        NODE_ENV: JSON.stringify("production")
      }
    }),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: "[name].css",
      chunkFilename: "[id].css"
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
          loader: "file-loader"
        }
      },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            plugins: [
              "@babel/plugin-proposal-class-properties",
              "lodash",
              [
                "module-resolver",
                {
                  root: [path.join(__dirname, "../chrome")]
                }
              ]
            ],
            presets: [
              "@babel/preset-react",
              [
                "@babel/preset-env",
                {
                  targets: {
                    browsers: ["last 2 Chrome versions"]
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
          {
            loader: MiniCssExtractPlugin.loader
          },
          { loader: "css-loader", options: { importLoaders: 1 } },
          {
            loader: "postcss-loader",
            options: {
              exclude: /(node_modules|bower_components)/
            }
          }
        ]
      }
    ]
  }
};
