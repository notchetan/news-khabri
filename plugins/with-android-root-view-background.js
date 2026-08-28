const {
  withAndroidColors,
  withAndroidColorsNight,
  withAndroidStyles,
  AndroidConfig,
} = require("@expo/config-plugins");

// Sets Android's static android:windowBackground theme attribute, with a
// light/dark split via colors.xml - see docs/navigation-white-flash.md's
// fourth layer for why this is needed (expo-system-ui's own equivalent
// plugin only supports a single color, no dark variant).
const COLOR_NAME = "rootViewBackground";

function withAndroidRootViewBackground(config, { light, dark }) {
  config = withAndroidColors(config, (config) => {
    config.modResults = AndroidConfig.Colors.assignColorValue(config.modResults, {
      name: COLOR_NAME,
      value: light,
    });
    return config;
  });

  config = withAndroidColorsNight(config, (config) => {
    config.modResults = AndroidConfig.Colors.assignColorValue(config.modResults, {
      name: COLOR_NAME,
      value: dark,
    });
    return config;
  });

  config = withAndroidStyles(config, (config) => {
    config.modResults = AndroidConfig.Styles.assignStylesValue(config.modResults, {
      add: true,
      parent: AndroidConfig.Styles.getAppThemeGroup(),
      name: "android:windowBackground",
      value: `@color/${COLOR_NAME}`,
    });
    return config;
  });

  return config;
}

module.exports = (config, { light = "#FFFFFF", dark = "#000000" } = {}) =>
  withAndroidRootViewBackground(config, { light, dark });
