import { act, fireEvent, render, screen } from "@testing-library/react-native";

import ErrorState from "@/components/error-state";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";

jest.mock("@/hooks/use-color-scheme", () => ({ useColorScheme: () => "light" }));

async function renderState(props: React.ComponentProps<typeof ErrorState>) {
  await act(async () => {
    render(
      <ThemePreferenceProvider>
        <LanguagePreferenceProvider>
          <ErrorState {...props} />
        </LanguagePreferenceProvider>
      </ThemePreferenceProvider>
    );
  });
}

describe("ErrorState", () => {
  it("renders the message and a retry button that calls onRetry", async () => {
    const onRetry = jest.fn();
    await renderState({ message: "It broke", onRetry, testID: "err" });

    expect(screen.getByText("It broke")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders no button when onRetry is omitted", async () => {
    await renderState({ message: "Nothing to retry" });

    expect(screen.getByText("Nothing to retry")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
