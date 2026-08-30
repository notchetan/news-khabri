import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { NotificationPreferenceProvider } from "@/contexts/notification-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import NotificationsScreen from "../notifications";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("@/api/notifications", () => ({
  registerPushSubscription: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: "ExponentPushToken[test]" }),
}));

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, replace: jest.fn(), canGoBack: () => true }),
}));

function renderScreen() {
  return render(
    <ThemePreferenceProvider>
      <LanguagePreferenceProvider>
        <NotificationPreferenceProvider>
          <NotificationsScreen />
        </NotificationPreferenceProvider>
      </LanguagePreferenceProvider>
    </ThemePreferenceProvider>
  );
}

describe("NotificationsScreen (Apple-style pushed picker)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it("lists every interval option, with Off selected by default", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(screen.getByText("Off")).toBeTruthy();
    expect(screen.getByText("Every 5 minutes")).toBeTruthy();
    expect(screen.getByText("Every 15 minutes")).toBeTruthy();
    expect(screen.getByText("Every 30 minutes")).toBeTruthy();
    expect(screen.getByText("Every 60 minutes")).toBeTruthy();
    expect(screen.getByText("Every 120 minutes")).toBeTruthy();

    expect(
      screen.getByRole("button", { name: "Off" })
    ).toHaveProp("accessibilityState", expect.objectContaining({ selected: true }));
  });

  it("shows a PageHeader matching the article page's own header", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(screen.getByTestId("notifications-header-row")).toBeTruthy();
    expect(screen.getByTestId("notifications-back-chevron")).toBeTruthy();
    expect(screen.getByTestId("notifications-brand-logo")).toBeTruthy();
  });

  it("selecting a new interval persists it and navigates back", async () => {
    await act(async () => {
      renderScreen();
    });

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Every 15 minutes" }));
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
    await waitFor(async () => {
      expect(await AsyncStorage.getItem("notificationPreference")).toBe("15");
    });
  });

  it("marks the previously persisted interval as selected", async () => {
    await AsyncStorage.setItem("notificationPreference", "60");

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Every 60 minutes" })
      ).toHaveProp("accessibilityState", expect.objectContaining({ selected: true }));
    });
    expect(
      screen.getByRole("button", { name: "Off" })
    ).toHaveProp("accessibilityState", expect.objectContaining({ selected: false }));
  });
});
