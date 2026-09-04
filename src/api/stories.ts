import { apiFetch } from "./client";

export type StoryRepresentativeArticle = {
  id: number;
  title: string;
  link: string;
  source: string;
  image_url: string | null;
  published_at: string;
};

export type Story = {
  id: number;
  title: string;
  summary: string | null;
  category: string;
  language: string;
  articleCount: number;
  sourceCount: number;
  firstPublishedAt: string;
  latestPublishedAt: string;
  storyScore: number;
  representativeArticle: StoryRepresentativeArticle | null;
};

export type StoryMember = {
  id: number;
  title: string;
  link: string;
  source: string;
  image_url: string | null;
  published_at: string;
  language: string;
};

export type StoryDetail = Story & {
  members: StoryMember[];
};

// Must match the backend's own cap on /stories/top's limit param (see
// routes/stories.js).
export const STORY_FEED_MAX_LIMIT = 50;
export const STORIES_PAGE_SIZE = 20;

// Named fetchStoryFeed (not fetchTopStories) to avoid colliding with the
// existing per-article ranked feed in api/articles.ts - that endpoint stays
// untouched and is still used elsewhere.
//
// `token` is optional and purely additive - sending it (when signed in)
// lets the backend blend in its personalized-ranking signal (see the
// backend's docs/personalization.md); omitting it gives the exact same
// public, unpersonalized ranking as before that feature existed.
export async function fetchStoryFeed(
  language: string,
  category?: string,
  limit?: number,
  sources?: string[],
  token?: string | null
): Promise<Story[]> {
  const params = new URLSearchParams({ language });
  if (category) params.set("category", category);
  if (limit) params.set("limit", String(limit));
  if (sources && sources.length > 0) params.set("sources", sources.join(","));

  return apiFetch(`/stories/top?${params}`, {
    token,
    errorMessage: "Failed to fetch story feed",
  });
}

export async function fetchStoryDetail(id: number): Promise<StoryDetail> {
  return apiFetch(`/stories/${id}`, { errorMessage: "Failed to fetch story" });
}
