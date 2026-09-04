import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react-native";
import { useContext } from "react";
import { Text } from "react-native";

import { createPersistedPreference } from "../create-persisted-preference";
import { notifyPreferenceChanged } from "@/utils/preference-sync";

const KEY = "testPref";

function makeNumberPref() {
  return createPersistedPreference<number>({
    storageKey: KEY,
    defaultValue: 7,
    // Only 0, 1, 2 are valid; anything else -> undefined (keep default).
    codec: {
      parse: (raw) => {
        const n = Number(raw);
        return [0, 1, 2].includes(n) ? n : undefined;
      },
      serialize: (v) => String(v),
    },
  });
}

function useValue(base: ReturnType<typeof makeNumberPref>) {
  const ctx = useContext(base.Context);
  return ctx!;
}

describe("createPersistedPreference", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("uses the default when nothing is stored", async () => {
    const base = makeNumberPref();
    const { result } = await renderHook(() => useValue(base), {
      wrapper: ({ children }) => <base.Provider>{children}</base.Provider>,
    });
    await waitFor(() => expect(result.current.value).toBe(7));
  });

  it("applies a stored value the codec accepts - including a falsy-but-valid one", async () => {
    await AsyncStorage.setItem(KEY, "0");
    const base = makeNumberPref();
    const { result } = await renderHook(() => useValue(base), {
      wrapper: ({ children }) => <base.Provider>{children}</base.Provider>,
    });
    await waitFor(() => expect(result.current.value).toBe(0));
  });

  it("keeps the default when the stored value fails the codec", async () => {
    await AsyncStorage.setItem(KEY, "99");
    const base = makeNumberPref();
    const { result } = await renderHook(() => useValue(base), {
      wrapper: ({ children }) => <base.Provider>{children}</base.Provider>,
    });
    // Give the async load a chance to run, then confirm it left the default.
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.value).toBe(7);
  });

  it("setValue persists and re-reads on the preference-sync bus", async () => {
    const base = makeNumberPref();
    const { result } = await renderHook(() => useValue(base), {
      wrapper: ({ children }) => <base.Provider>{children}</base.Provider>,
    });
    await waitFor(() => expect(result.current.value).toBe(7));

    await act(async () => {
      result.current.setValue(2);
    });
    expect(result.current.value).toBe(2);
    expect(await AsyncStorage.getItem(KEY)).toBe("2");

    // A different device / the auth-context pull writes storage directly,
    // then rings the bus - the provider should pick it up.
    await AsyncStorage.setItem(KEY, "1");
    await act(async () => {
      notifyPreferenceChanged();
    });
    await waitFor(() => expect(result.current.value).toBe(1));
  });

  it("renders children (the Provider is a real component)", async () => {
    const base = makeNumberPref();
    await act(async () => {
      render(
        <base.Provider>
          <Text>child</Text>
        </base.Provider>
      );
    });
    expect(screen.getByText("child")).toBeTruthy();
  });
});
