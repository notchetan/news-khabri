import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        setHasCompletedOnboarding(stored === "true");
      })
      .catch(() => {
        // The root layout renders nothing (holding the native splash up)
        // while this is null, so an unhandled rejection here left the app
        // stuck on the splash screen forever with no way out. A read we
        // can't complete means we don't know they've onboarded - send them
        // through it rather than hanging.
        setHasCompletedOnboarding(false);
      });
  }, []);

  const completeOnboarding = async () => {
    setHasCompletedOnboarding(true);
    // Best-effort: failing to persist means onboarding shows again next
    // launch, which is a far better outcome than rejecting here and
    // stranding the reader on the last onboarding screen.
    await AsyncStorage.setItem(STORAGE_KEY, "true").catch(() => {});
  };

  const value = useMemo(
    () => ({ hasCompletedOnboarding, completeOnboarding }),
    // completeOnboarding closes over nothing that changes, so the value only
    // needs to change when the flag does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasCompletedOnboarding]
  );

  return (
    <OnboardingContext.Provider value={value}>
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
