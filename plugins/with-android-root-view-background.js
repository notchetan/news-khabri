const {
  withAndroidColors,
  withAndroidColorsNight,
  withAndroidStyles,
  AndroidConfig,
} = require("@expo/config-plugins");

// expo-system-ui's own withAndroidRootViewBackgroundColor plugin (see
// node_modules/expo-system-ui/plugin/src/withAndroidRootViewBackgroundColor.ts)
// only reads a single expo.android.backgroundColor - no light/dark split,
// unlike expo-splash-screen's own plugin (which does support a `dark`
// sub-key, already used for this app's splash screen in app.json). Without
// android:windowBackground set at all, AppTheme falls back to
// Theme.AppCompat.DayNight's own default (plain white/near-black) - the
// color Android's edge-to-edge rounded-corner mask actually samples, which
// is a *different* layer than the ones docs/navigation-white-flash.md's
// three layers already cover (React Navigation's Theme, expo-system-ui's
// *runtime* setBackgroundColorAsync call, and the react-native-screens
// patch) - all three of those only take effect once JS has run, and none
// of them touch this static theme attribute. Colors.xml's own
// values/values-night split (the same mechanism expo-splash-screen already
// relies on for splashscreen_background) makes this correct from the very
// first native frame, no JS involved.
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
