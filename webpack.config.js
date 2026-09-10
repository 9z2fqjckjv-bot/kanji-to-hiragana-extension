const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  target: ["web", "es2020"],
  entry: {
    content: "./src/content/content.js",
    popup: "./src/popup/popup.js",
    background: "./src/background/service-worker.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
    globalObject: "globalThis",
  },
  resolve: {
    fallback: {
      // Custom shim: path-browserify breaks chrome-extension:// URLs
      path: path.resolve(__dirname, "src/shims/path.js"),
      fs: false,
    },
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "src/manifest.json", to: "manifest.json" },
        { from: "src/popup/popup.html", to: "popup.html" },
        { from: "src/popup/popup.css", to: "popup.css" },
        { from: "src/icons", to: "icons" },
        {
          from: "node_modules/kuromoji/dict",
          to: "dict",
        },
      ],
    }),
  ],
  devtool: false,
  performance: {
    hints: false,
  },
};
