describe("API_BASE_URL", () => {
  const original = process.env.EXPO_PUBLIC_API_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = original;
    jest.resetModules();
  });

  function load() {
    let value = "";
    jest.isolateModules(() => {
      value = require("../config").API_BASE_URL;
    });
    return value;
  }

  it("falls back to the local-dev address when the env var is unset", () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(load()).toBe("http://localhost:3000");
  });

  it("uses EXPO_PUBLIC_API_URL when set", () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.newskhabri.app";
    expect(load()).toBe("https://api.newskhabri.app");
  });

  it("strips a trailing slash so callers can append '/path' safely", () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.newskhabri.app/";
    expect(load()).toBe("https://api.newskhabri.app");
  });
});
