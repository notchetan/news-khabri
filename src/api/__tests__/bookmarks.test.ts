import {
  addBookmark,
  clearBookmarks,
  fetchBookmarks,
  removeBookmark,
} from "../bookmarks";

function mockFetchOnce(value: unknown, ok = true) {
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok, json: async () => value }) as unknown as typeof fetch;
}

describe("bookmarks API client", () => {
  it("fetchBookmarks GETs with the bearer token and returns the list", async () => {
    const list = [{ id: 1, title: "Saved one" }];
    mockFetchOnce(list);

    const result = await fetchBookmarks("session-token");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/me/bookmarks"),
      expect.objectContaining({
        headers: { Authorization: "Bearer session-token" },
      })
    );
    expect(result).toEqual(list);
  });

  it("addBookmark POSTs the articleId as JSON with the bearer token", async () => {
    mockFetchOnce(undefined);

    await addBookmark("session-token", 42);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/me/bookmarks"),
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer session-token",
        },
        body: JSON.stringify({ articleId: 42 }),
      })
    );
  });

  it("removeBookmark DELETEs /me/bookmarks/:id with the bearer token", async () => {
    mockFetchOnce(undefined);

    await removeBookmark("session-token", 42);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/me/bookmarks/42"),
      expect.objectContaining({
        method: "DELETE",
        headers: { Authorization: "Bearer session-token" },
      })
    );
  });

  it("clearBookmarks DELETEs /me/bookmarks with the bearer token", async () => {
    mockFetchOnce(undefined);

    await clearBookmarks("session-token");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/me\/bookmarks$/),
      expect.objectContaining({
        method: "DELETE",
        headers: { Authorization: "Bearer session-token" },
      })
    );
  });

  it("throws when a response is not ok", async () => {
    mockFetchOnce(undefined, false);
    await expect(fetchBookmarks("t")).rejects.toThrow("Failed to fetch bookmarks");

    mockFetchOnce(undefined, false);
    await expect(addBookmark("t", 1)).rejects.toThrow("Failed to add bookmark");

    mockFetchOnce(undefined, false);
    await expect(removeBookmark("t", 1)).rejects.toThrow("Failed to remove bookmark");

    mockFetchOnce(undefined, false);
    await expect(clearBookmarks("t")).rejects.toThrow("Failed to clear bookmarks");
  });
});
