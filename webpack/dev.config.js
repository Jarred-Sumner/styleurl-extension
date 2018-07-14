const path = require("path");
const webpack = require("webpack");
const WriteAssetsWebpackPlugin = require("write-assets-webpack-plugin");

const autoprefixer = require("autoprefixer");

const host = "localhost";
const port = 3000;
const customPath = path.join(__dirname, "./customPublicPath");
const hotScript =
  "webpack-hot-middleware/client?path=__webpack_hmr&dynamicPublicPath=true";

const baseDevConfig = () => ({
  devtool: "eval-cheap-module-source-map",
  node: {
    dns: "empty",
    net: "empty"
  },

  entry: {
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
    publicPath: `http://${host}:${port}/js`,
    stats: {
      colors: true
    },
    noInfo: true,
    headers: { "Access-Control-Allow-Origin": "*" }
  },
  mode: "development",
  hotMiddleware: {
    path: "/js/__webpack_hmr"
  },
  output: {
    path: path.join(__dirname, "../dev/js"),
    filename: "[name].bundle.js",
    chunkFilename: "[id].chunk.js"
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.IgnorePlugin(/[^/]+\/[\S]+.prod$/),
    new webpack.DefinePlugin({
      __HOST__: `'${host}'`,
      __PORT__: port,
      __API_HOST__: "`http://localhost:3001`",
      "process.env": {
        NODE_ENV: JSON.stringify("development")
      }
    }),
    new WriteAssetsWebpackPlugin({ force: true, extension: ["js"] })
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
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
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
          "css-loader?modules&sourceMap&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]",
          {
            loader: "postcss-loader",
            options: {
              plugins: () => [autoprefixer]
            }
          }
        ]
      }
    ]
  }
});

const injectPageConfig = baseDevConfig();
injectPageConfig.entry = [
  customPath,
  path.join(__dirname, "../chrome/extension/inject")
];
delete injectPageConfig.hotMiddleware;
delete injectPageConfig.module.rules[0].options;
injectPageConfig.plugins.shift(); // remove HotModuleReplacementPlugin
injectPageConfig.output = {
  path: path.join(__dirname, "../dev/js"),
  filename: "inject.bundle.js"
};
const appConfig = baseDevConfig();

module.exports = [injectPageConfig, appConfig];
