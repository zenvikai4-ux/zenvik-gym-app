module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { unstable_transformImportMeta: true }]
    ],
    plugins: [
      // react-native-reanimated plugin must be listed last
      "react-native-reanimated/plugin",
    ],
  };
};
