import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "hasCompletedOnboarding";

type OnboardingContextValue = {
  // null while the AsyncStorage read is in flight - the root layout holds
  // off deciding whether to show onboarding or the real app until this
  // resolves, rather than optimistically guessing and risking a flash of
  // one screen right before redirecting to the other.
  hasCompletedOnboarding: boolean | null;
  completeOnboarding: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | undefined>(
  undefined
);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      setHasCompletedOnboarding(stored === "true");
    });
  }, []);

  const completeOnboarding = async () => {
    setHasCompletedOnboarding(true);
    await AsyncStorage.setItem(STORAGE_KEY, "true");
  };

  return (
    <OnboardingContext.Provider
      value={{ hasCompletedOnboarding, completeOnboarding }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return ctx;
}
