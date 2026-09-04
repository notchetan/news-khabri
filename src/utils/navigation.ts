import type { Href } from "expo-router";

// Typed-route Href builders for the article/story destinations. The screens
// that navigate here take basePath as a narrow literal-union prop (a
// home-tab vs. search-tab copy of the same screen renders under a different
// segment), so branching on the literal keeps every result inside
// expo-router's typed Href union - no `(router.push as any)` +
// eslint-disable at the call sites, which is what this used to be
// everywhere.
export type ArticleBasePath = "/article" | "/search/article";

export function articleHref(
  id: number | string,
  basePath: ArticleBasePath = "/article"
): Href {
  const params = { id: String(id) };
  return basePath === "/search/article"
    ? { pathname: "/search/article/[id]", params }
    : { pathname: "/article/[id]", params };
}

export function storyHref(id: number | string): Href {
  return { pathname: "/story/[id]", params: { id: String(id) } };
}
