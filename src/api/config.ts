// Base URL for the backend API, shared by every module in this folder.
//
// Set EXPO_PUBLIC_API_URL to point at a real deployment (it's inlined into
// the bundle at build time - EAS build profiles / .env.production for
// release, .env.local for a physical device or the Android emulator's
// 10.0.2.2). The fallback is the conventional local-dev address, which
// works for the iOS simulator and `expo start` on the same machine.
//
// A production build MUST use https - iOS App Transport Security blocks
// plaintext http.
const RAW = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

// Tolerate a trailing slash in the configured value so callers can keep
// writing `${API_BASE_URL}/articles`.
export const API_BASE_URL = RAW.replace(/\/+$/, "");
