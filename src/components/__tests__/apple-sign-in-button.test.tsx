import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

import { AppleSignInButton } from "@/components/apple-sign-in-button";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";

jest.mock("@/hooks/use-color-scheme", () => ({ useColorScheme: () => "light" }));

function renderButton(onPress = jest.fn()) {
  return {
    onPress,
    ...render(
      <ThemePreferenceProvider>
        <AppleSignInButton onPress={onPress} />
      </ThemePreferenceProvider>
    ),
  };
}

describe("AppleSignInButton", () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
  });

  it("renders the native Apple button on iOS and forwards presses", async () => {
    Platform.OS = "ios";
    let onPress = jest.fn();
    await act(async () => {
      ({ onPress } = renderButton());
    });

    const button = screen.getByTestId("apple-sign-in");
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders nothing on Android", async () => {
    Platform.OS = "android";
    await act(async () => {
      renderButton();
    });

    expect(screen.queryByTestId("apple-sign-in")).toBeNull();
  });
});
