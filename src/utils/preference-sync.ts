// A push/pull side-channel every preference context (and AuthProvider)
// shares, independent of provider nesting order - see "The preference
// sync bus" in docs/google-sign-in.md.
type Listener = () => void;
const listeners = new Set<Listener>();

export function onPreferenceChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyPreferenceChanged() {
  listeners.forEach((listener) => listener());
}
