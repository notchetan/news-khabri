jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

require("react-native-gesture-handler/jestSetup");

// react-native-worklets (bumped 0.5.1 -> 0.7.x alongside the SDK 55
// upgrade) now throws "Native part of Worklets doesn't seem to be
// initialized" under Jest instead of silently no-op-ing like the older
// version did - the library ships its own jest mock for exactly this.
jest.mock("react-native-worklets", () =>
  require("react-native-worklets/lib/module/mock")
);

jest.mock("react-native-safe-area-context", () => {
  const mock = require("react-native-safe-area-context/jest/mock");
  return mock.default ?? mock;
});
