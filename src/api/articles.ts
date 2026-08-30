const BASE_URL = "http://192.168.0.55:3000";

export type Article = {
  id: number;
  title: string;
  link: string;
  source: string;
  category: string;
  published_at: string;
  image_url: string | null;
  fetched_at: string;
  language: string;
  // Attached to every /articles result (for the debug ranking pill) -
  // informational only, doesn't affect this endpoint's chronological order.
  ranking_score?: number;
  ranking_freshness?: number;
  ranking_importance?: number;
  ranking_sourceAuthority?: number;
};

export type ArticleDetail = Article & {
  content: string | null;
  image_caption: string | null;
  read_time_minutes: number | null;
  related: Article[];
};

export const ARTICLES_PAGE_SIZE = 20;

export function cursorFor(article: Article): string {
  return `${article.fetched_at}|${article.id}`;
}

export async function fetchArticles(
  language: string,
  category?: string,
  cursor?: string,
  search?: string,
  sources?: string[]
): Promise<Article[]> {
  const params = new URLSearchParams({
    limit: String(ARTICLES_PAGE_SIZE),
    language,
  });
  if (category) params.set("category", category);
  if (cursor) params.set("cursor", cursor);
  if (search) params.set("search", search);
  if (sources && sources.length > 0) params.set("sources", sources.join(","));

  const res = await fetch(`${BASE_URL}/articles?${params}`);
  if (!res.ok) throw new Error("Failed to fetch articles");
  return res.json();
}

export async function fetchArticleDetail(id: number): Promise<ArticleDetail> {
  const res = await fetch(`${BASE_URL}/articles/${id}`);
  if (!res.ok) throw new Error("Failed to fetch article");
  return res.json();
}

export async function fetchCategories(
  language: string,
  sources?: string[]
): Promise<string[]> {
  const params = new URLSearchParams({ language });
  if (sources && sources.length > 0) params.set("sources", sources.join(","));

  const res = await fetch(`${BASE_URL}/categories?${params}`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function fetchLanguages(): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/languages`);
  if (!res.ok) throw new Error("Failed to fetch languages");
  return res.json();
}

export async function fetchSources(language: string): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/sources?language=${language}`);
  if (!res.ok) throw new Error("Failed to fetch sources");
  return res.json();
}
