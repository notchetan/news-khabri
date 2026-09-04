import { apiFetch } from "../client";

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
