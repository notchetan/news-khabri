import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import Toast, { type ToastConfig } from "@/components/toast";

// A tiny app-global toast bus - one toast at a time, a fresh show()
// replaces whatever's on screen and restarts the dismiss timer.
type ToastContextValue = {
  show: (config: ToastConfig) => void;
  hide: () => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_DURATION_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ToastConfig | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    setConfig(null);
  }, [clearTimer]);

  const show = useCallback(
    (next: ToastConfig) => {
      clearTimer();
      setConfig(next);
      timer.current = setTimeout(() => setConfig(null), TOAST_DURATION_MS);
    },
    [clearTimer]
  );

  useEffect(() => clearTimer, [clearTimer]);

  // show/hide are already stable useCallbacks, so memoizing the value object
  // keeps every useToast() consumer from re-rendering each time this
  // provider does - and it re-renders on every toast, wrapping the app.
  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast config={config} onHide={hide} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
