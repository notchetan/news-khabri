import { fetchMe, putPreferences, signInWithGoogle } from "../auth";

function mockFetchOnce(body: unknown, ok = true) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

describe("signInWithGoogle", () => {
  it("POSTs the Google ID token and returns the session response", async () => {
    const response = {
      token: "session-token",
      user: { id: 1, email: "chetan@example.com", name: "Chetan Shetty", avatarUrl: null },
      preferences: null,
    };
    mockFetchOnce(response);

    const result = await signInWithGoogle("google-id-token");

    expect(result).toEqual(response);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/google"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: "google-id-token" }),
      })
    );
  });

  it("throws when the response is not ok", async () => {
    mockFetchOnce(null, false);
    await expect(signInWithGoogle("bad-token")).rejects.toThrow(
      "Failed to sign in with Google"
    );
  });
});

describe("fetchMe", () => {
  it("sends the session token as a bearer header", async () => {
    const response = {
      user: { id: 1, email: "chetan@example.com", name: "Chetan Shetty", avatarUrl: null },
      preferences: null,
    };
    mockFetchOnce(response);

    const result = await fetchMe("session-token");

    expect(result).toEqual(response);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/me"),
      expect.objectContaining({ headers: { Authorization: "Bearer session-token" } })
    );
  });

  it("throws when the response is not ok", async () => {
    mockFetchOnce(null, false);
    await expect(fetchMe("bad-token")).rejects.toThrow("Failed to fetch account");
  });
});

describe("putPreferences", () => {
  const preferences = {
    theme: "night",
    fontSize: "large",
    language: "hi",
    debugEnabled: true,
    sources: { hi: ["Aaj Tak"] },
    notificationInterval: 15,
  };

  it("PUTs the full preference bundle with the session token", async () => {
    mockFetchOnce({});

    await putPreferences("session-token", preferences);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/me/preferences"),
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer session-token" },
        body: JSON.stringify(preferences),
      })
    );
  });

  it("throws when the response is not ok", async () => {
    mockFetchOnce(null, false);
    await expect(putPreferences("session-token", preferences)).rejects.toThrow(
      "Failed to save preferences"
    );
  });
});
