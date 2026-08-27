import { useColorScheme as useRNColorScheme } from "react-native";

import { useColorScheme } from "../use-color-scheme";

test("re-exports react-native's useColorScheme directly", () => {
  expect(useColorScheme).toBe(useRNColorScheme);
});
