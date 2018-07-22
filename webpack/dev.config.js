const path = require("path");
const webpack = require("webpack");
const WriteAssetsWebpackPlugin = require("write-assets-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const autoprefixer = require("autoprefixer");

const host = "localhost";
const port = 3000;
const customPath = path.join(__dirname, "./customPublicPath");
const hotScript =
  "webpack-hot-middleware/client?path=__webpack_hmr&dynamicPublicPath=true";

module.exports = {
  devtool: "eval-cheap-module-source-map",
  node: {
    dns: "empty",
    net: "empty"
  },
  entry: {
    inline_style_observer: [
      customPath,
      path.join(__dirname, "../chrome/extension/inline_style_observer")
    ],
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
      hotScript,
      path.join(__dirname, "../chrome/extension/background")
    ],
    devtools: [
      customPath,
      hotScript,
      path.join(__dirname, "../chrome/extension/devtools")
    ],
    github_gist_content_script: [
      customPath,
      path.join(__dirname, "../chrome/extension/github_gist_content_script")
    ]
  },
  devMiddleware: {
    publicPath: `http://${host}:${port}/`,
    stats: {
      colors: true
    },
    noInfo: true,
    headers: { "Access-Control-Allow-Origin": "*" }
  },
  mode: "development",
  hotMiddleware: {
    path: "/__webpack_hmr"
  },
  output: {
    path: path.join(__dirname, "../dev"),
    filename: "[name].bundle.js",
    chunkFilename: "[id].chunk.js"
  },
  plugins: [
    new webpack.ContextReplacementPlugin(
      /monaco-editor(\\|\/)esm(\\|\/)vs(\\|\/)editor(\\|\/)common(\\|\/)services/,
      __dirname
    ),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.IgnorePlugin(/[^/]+\/[\S]+.prod$/),
    new webpack.DefinePlugin({
      __HOST__: `'${host}'`,
      __PORT__: port,
      __API_HOST__: "`http://localhost:3001`",
      __FRONTEND_HOST__: "`http://localhost:3002`",
      "process.env": {
        NODE_ENV: JSON.stringify("development")
      }
    }),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: "[name].css",
      chunkFilename: "[id].css"
    }),
    new WriteAssetsWebpackPlugin({ force: true, extension: ["js", "css"] })
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
