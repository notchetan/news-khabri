import { fetchStoryDetail } from "@/api/stories";
import ArticleImage from "@/components/article-image";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";
import { formatRelativeTime } from "@/utils/format-date";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  // The article detail screen a member row opens into, and the route this
  // story-feed lives under - same basePath/homePath convention used by
  // ArticleDetailScreen, kept for forward compatibility if a second
  // (e.g. search-tab) story surface is ever added.
  articleBasePath: "/article";
  homePath: "/";
};

export default function StoryDetailScreen({ articleBasePath, homePath }: Props) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const storyId = Number(id);
  const { data, isLoading, error } = useQuery({
    queryKey: ["story", storyId],
    queryFn: () => fetchStoryDetail(storyId),
  });

  const topPadding = Platform.select({
    default: insets.top + Spacing.two,
    web: Spacing.six,
  });

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // homePath is a prop, so typed routes can't verify it statically.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (router.replace as any)(homePath);
    }
  };

  const updatedLabel = data ? formatRelativeTime(data.latestPublishedAt, t) : null;

  // A story itself has no single canonical URL (it's an aggregate of every
  // member article) - the representative article's own link is the closest
  // real, dereferenceable thing to share, same choice the hero image above
  // already makes for its source.
  const shareStory = async () => {
    const link = data?.representativeArticle?.link;
    if (!data || !link) return;
    try {
      // See ArticleDetailScreen's shareArticle for why Android needs the
      // link folded into `message` rather than passed as `url`.
      await Share.share(
        Platform.OS === "ios"
          ? { title: data.title, url: link }
          : { message: `${data.title}\n${link}` },
        { dialogTitle: data.title }
      );
    } catch {
      // Share sheet dismissed, or unsupported - nothing to recover from.
    }
  };

  // A story that only one source/article ever joined isn't really a
  // cluster - the list screen already routes straight to the article for
  // these (see story-list.tsx), but this screen is still reachable directly
  // (a deep link, a push notification, cached navigation state), so it
  // needs its own guard: bounce straight to the article rather than show a
  // "1 sources · 1 articles" page with nothing to add over the article
  // itself. replace (not push) so the back gesture doesn't return here.
  const isSingleton = data ? data.articleCount <= 1 && data.sourceCount <= 1 : false;
  const representativeArticleId = data?.representativeArticle?.id;
  useEffect(() => {
    if (isSingleton && representativeArticleId != null) {
      // articleBasePath is a prop, so typed routes can't verify it
      // statically like a literal pathname.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (router.replace as any)({
        pathname: `${articleBasePath}/[id]`,
        params: { id: String(representativeArticleId) },
      });
    }
  }, [isSingleton, representativeArticleId, articleBasePath, router]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: topPadding }}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={goBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("back")}
          style={[styles.backPressable, styles.backPressableRow]}
        >
          <SymbolView
            name="chevron.left"
            size={16}
            weight="semibold"
            tintColor={theme.text}
            fallback={<ThemedText style={styles.backGlyph}>‹</ThemedText>}
          />
          <ThemedText style={styles.backGlyph}>{" " + t("back")}</ThemedText>
        </Pressable>
      </View>

      {isLoading || isSingleton ? (
        <View style={styles.centerFill} accessibilityRole="progressbar" accessibilityLabel={t("loadingStory")}>
          <ActivityIndicator />
        </View>
      ) : error || !data ? (
        <View style={styles.centerFill}>
          <ThemedText themeColor="textSecondary">{t("storyLoadError")}</ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ArticleImage
            uri={data.representativeArticle?.image_url ?? null}
            category={data.category}
            alt={data.title}
            radius={Radius.large}
          />
          <ThemedText type="subtitle" style={styles.title} accessibilityRole="header">
            {data.title}
          </ThemedText>

          <View style={styles.metaRow}>
            <View style={styles.metaTextBlock}>
              <ThemedText themeColor="textSecondary" style={styles.meta}>
                {t("storySourcesTemplate", { count: String(data.sourceCount) })}
                {" · "}
                {t("storyArticlesTemplate", { count: String(data.articleCount) })}
              </ThemedText>
              {updatedLabel && (
                <ThemedText themeColor="textSecondary" style={styles.meta}>
                  {t("storyUpdatedTemplate", { time: updatedLabel })}
                </ThemedText>
              )}
            </View>

            <TouchableOpacity
              onPress={shareStory}
              style={[styles.shareButton, { backgroundColor: theme.backgroundElement }]}
              accessibilityRole="button"
              accessibilityLabel={t("share")}
            >
              <SymbolView
                name="square.and.arrow.up"
                size={16}
                weight="semibold"
                tintColor={theme.text}
                fallback={<ThemedText style={styles.shareGlyphFallback}>⬆</ThemedText>}
              />
              <ThemedText style={styles.shareButtonText}>{t("share")}</ThemedText>
            </TouchableOpacity>
          </View>
          {data.summary && (
            <ThemedText style={styles.summary}>{data.summary}</ThemedText>
          )}

          <View style={styles.membersSection}>
            <ThemedText
              type="smallBold"
              style={styles.membersHeading}
              accessibilityRole="header"
            >
              {t("storyMembersHeading")}
            </ThemedText>
            {data.members.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[styles.memberRow, { borderColor: theme.backgroundSelected }]}
                onPress={() =>
                  // articleBasePath is a prop, so typed routes can't verify
                  // this dynamic pathname statically like a literal.
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (router.push as any)({
                    pathname: `${articleBasePath}/[id]`,
                    params: { id: String(member.id) },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`${member.title}, ${member.source}`}
              >
                <View style={styles.memberThumb}>
                  <ArticleImage
                    uri={member.image_url}
                    category={data.category}
                    height={80}
                    alt={member.title}
                    radius={Radius.small}
                  />
                </View>
                <View style={styles.memberTextBlock}>
                  <ThemedText numberOfLines={3} style={styles.memberTitle}>
                    {member.title}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    {member.source}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  backPressable: { alignSelf: "flex-start", paddingVertical: Spacing.one },
  backPressableRow: { flexDirection: "row", alignItems: "center" },
  backGlyph: { fontSize: 16, fontWeight: "600" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six },
  title: { marginTop: Spacing.three },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.one,
  },
  metaTextBlock: { gap: 2 },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
  },
  shareButtonText: { fontSize: 14, fontWeight: "600" },
  shareGlyphFallback: { fontSize: 14, fontWeight: "700" },
  meta: {},
  summary: { marginTop: Spacing.three },
  membersSection: { marginTop: Spacing.five },
  membersHeading: { letterSpacing: 0.5, marginBottom: Spacing.two },
  memberRow: {
    flexDirection: "row",
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
  },
  memberThumb: { width: 80, height: 80 },
  memberTextBlock: { flex: 1, justifyContent: "center", gap: 4 },
  memberTitle: { fontSize: 14, fontWeight: "600" },
});
