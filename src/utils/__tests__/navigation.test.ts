import { articleHref, storyHref } from "../navigation";

describe("articleHref", () => {
  it("defaults to the home-tab article route", () => {
    expect(articleHref(42)).toEqual({
      pathname: "/article/[id]",
      params: { id: "42" },
    });
  });

  it("uses the search-tab route when that basePath is passed", () => {
    expect(articleHref(42, "/search/article")).toEqual({
      pathname: "/search/article/[id]",
      params: { id: "42" },
    });
  });

  it("stringifies the id", () => {
    expect(articleHref("7")).toEqual({
      pathname: "/article/[id]",
      params: { id: "7" },
    });
  });
});

describe("storyHref", () => {
  it("builds the story route with a stringified id", () => {
    expect(storyHref(9)).toEqual({
      pathname: "/story/[id]",
      params: { id: "9" },
    });
  });
});
