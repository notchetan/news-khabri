jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

require("react-native-gesture-handler/jestSetup");

jest.mock("react-native-safe-area-context", () => {
  const mock = require("react-native-safe-area-context/jest/mock");
  return mock.default ?? mock;
});

// The native Sentry module isn't present under jest; the wrapper in
// src/observability/sentry.ts is what the tests actually exercise.
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  wrap: (component) => component,
  captureException: jest.fn(),
}));

// Native module - jest-expo runs with Platform.OS "ios", so the
// AppleSignInButton actually renders. The button forwards its props
// (testID, onPress) so tests can drive it; signInAsync is set per-test.
jest.mock("expo-apple-authentication", () => {
  const React = require("react");
  return {
    AppleAuthenticationButton: (props) => React.createElement("View", props),
    AppleAuthenticationButtonType: { SIGN_IN: 0, CONTINUE: 1, SIGN_UP: 2 },
    AppleAuthenticationButtonStyle: { WHITE: 0, WHITE_OUTLINE: 1, BLACK: 2 },
    AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
    signInAsync: jest.fn(),
    isAvailableAsync: jest.fn().mockResolvedValue(true),
  };
});
