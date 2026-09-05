import { apiFetch, ApiError, isAuthRejection } from "../client";

const BASE = "http://localhost:3000";

function mockFetch(impl: (url: string, opts: RequestInit) => unknown) {
  global.fetch = jest.fn(impl as never) as unknown as typeof fetch;
}

function okJson(body: unknown) {
  return { ok: true, json: () => Promise.resolve(body) };
}

describe("apiFetch", () => {
  it("prefixes the path with the base URL and returns parsed JSON", async () => {
    mockFetch(() => okJson({ hello: "world" }));

    const result = await apiFetch<{ hello: string }>("/thing", {
      errorMessage: "nope",
    });

    expect(result).toEqual({ hello: "world" });
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(`${BASE}/thing`);
  });

  it("throws the given message when the response is not ok", async () => {
    mockFetch(() => ({ ok: false, json: () => Promise.resolve(null) }));

    await expect(
      apiFetch("/thing", { errorMessage: "it failed" })
    ).rejects.toThrow("it failed");
  });

  // Callers need to tell "the server rejected this" from "the request never
  // landed" - a plain Error for both is how an offline launch used to destroy
  // a stored session. See auth-context.tsx.
  it("throws an ApiError carrying the status when the response is not ok", async () => {
    mockFetch(() => ({ ok: false, status: 401, json: () => Promise.resolve(null) }));

    await expect(apiFetch("/thing", { errorMessage: "nope" })).rejects.toMatchObject({
      name: "ApiError",
      message: "nope",
      status: 401,
    });
  });

  it("isAuthRejection is true only for 401/403, never for a transport failure", async () => {
    for (const [status, expected] of [
      [401, true],
      [403, true],
      [400, false],
      [500, false],
      [503, false],
    ] as const) {
      mockFetch(() => ({ ok: false, status, json: () => Promise.resolve(null) }));
      const err = await apiFetch("/thing", { errorMessage: "x" }).catch((e) => e);
      expect({ status, auth: isAuthRejection(err) }).toEqual({ status, auth: expected });
    }

    // A network failure never produces an ApiError at all.
    mockFetch(() => {
      throw new TypeError("Network request failed");
    });
    const netErr = await apiFetch("/thing", { errorMessage: "x" }).catch((e) => e);
    expect(netErr).not.toBeInstanceOf(ApiError);
    expect(isAuthRejection(netErr)).toBe(false);
  });

  it("adds a bearer header only when a token is passed", async () => {
    mockFetch(() => okJson([]));
    await apiFetch("/a", { errorMessage: "x", token: "abc" });
    expect((global.fetch as jest.Mock).mock.calls[0][1].headers).toEqual({
      Authorization: "Bearer abc",
    });

    mockFetch(() => okJson([]));
    await apiFetch("/b", { errorMessage: "x", token: null });
    expect((global.fetch as jest.Mock).mock.calls[0][1].headers).toBeUndefined();
  });

  it("serializes the body and sets Content-Type", async () => {
    mockFetch(() => okJson({}));

    await apiFetch("/c", {
      method: "POST",
      body: { a: 1 },
      parseJson: false,
      errorMessage: "x",
    });

    const opts = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(opts.method).toBe("POST");
    expect(opts.body).toBe(JSON.stringify({ a: 1 }));
    expect(opts.headers).toEqual({ "Content-Type": "application/json" });
  });

  it("does not read a body when parseJson is false", async () => {
    const json = jest.fn();
    mockFetch(() => ({ ok: true, json }));

    const result = await apiFetch("/d", { errorMessage: "x", parseJson: false });

    expect(result).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it("aborts the request once the timeout elapses", async () => {
    mockFetch(
      (_url, opts) =>
        new Promise((_resolve, reject) => {
          opts.signal?.addEventListener("abort", () =>
            reject(new Error("aborted"))
          );
        })
    );

    await expect(
      apiFetch("/slow", { errorMessage: "x", timeoutMs: 10 })
    ).rejects.toThrow("aborted");
  });

  it("passes an AbortSignal on every call", async () => {
    mockFetch(() => okJson([]));
    await apiFetch("/e", { errorMessage: "x" });
    const signal = (global.fetch as jest.Mock).mock.calls[0][1].signal;
    expect(typeof signal.aborted).toBe("boolean");
  });
});
