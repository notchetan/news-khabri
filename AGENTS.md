# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# News Khabri (frontend) — notes for AI agents

This file is for Claude and any other model working in this repo. It
covers what isn't obvious from reading the code cold: established
conventions, and non-obvious platform behavior that has already caused
real bugs in this app. Read it before making UI/layout changes,
especially anything involving `Animated`, `onLayout`, or keyboard/tab-bar
insets — those have burned real time here more than once.

The backend that this app talks to lives in a sibling repo,
`news-khabri-backend` (Node/Express + better-sqlite3 + node-cron). It has
its own `AGENTS.md` with backend-specific notes. See that repo's README
for the API surface (`src/routes/`).

## Architecture at a glance

- Expo SDK 54, `expo-router` (file-based routing under `src/app/`),
  React 19, RN 0.81.
- Data fetching: `@tanstack/react-query` over a thin `fetch`-based client
  in `src/api/` (`articles.ts`, `stories.ts`). No client-side caching
  logic of our own — react-query owns that.
- Preferences (theme, language, font size, debug mode) each live in
  their own React Context under `src/contexts/`, persisted to
  `AsyncStorage`, one provider per concern rather than one big settings
  context. `src/hooks/use-theme.ts` and `useTranslation()`
  (`src/i18n/translations.ts`) are the two you'll reach for constantly.
- i18n: 10 languages, each a plain `Record<string, string>` file under
  `src/i18n/locales/`, keyed by the same `TranslationKey` union (derived
  from `en.ts`). Adding a language = adding a locale file + registering
  it in `translations.ts`'s `translations` map — see that file's own
  comment.
- Design tokens live in `src/constants/theme.ts` (`Colors`, `Spacing`,
  `Radius`, type scale). Prefer these over ad hoc numbers for anything
  that repeats, but plenty of one-off small values (`gap: 6`, `gap: 4`)
  exist directly in component styles too — this codebase doesn't insist
  every number trace back to a token, just the ones that matter for
  consistency (spacing that needs to visually match elsewhere, edge
  padding meant to line up with something below it, etc).
- Full directory layout is in `README.md` — not repeated here since it's
  easy for the two to drift; check the README first for "where does X
  live".

## Testing & verification discipline

- `npx jest` (whole suite) and `npx tsc --noEmit` after *every* change,
  not just a targeted test file — this repo has caught real regressions
  in files nowhere near the one being edited. Report exact pass/fail
  counts; don't round up or hand-wave.
- There is **no live device/simulator/browser access in this
  environment.** Every UI/animation/layout change here is
  reasoning-plus-unit-test only. Say so plainly when reporting a visual
  fix, and expect — don't be surprised by — the user finding it's still
  wrong on a real device. This has happened repeatedly on animated,
  measurement-dependent UI (see the `Animated`/`onLayout` section
  below); when it does, prefer changing approach over re-guessing the
  same fragile structure with a different number.
- `Animated`-interpolated style props (opacity, etc.) resolve to real
  numeric values under `@testing-library/react-native` — confirmed
  empirically, not assumed. `fireEvent.scroll(view, { nativeEvent: {
  contentOffset: { x } } })` and `fireEvent(view, "layout", {
  nativeEvent: { layout: { width, height } } })` are the two events
  worth knowing for testing scroll-driven and onLayout-driven UI.
- Give every node you intend to assert on or fire events on an explicit
  `testID` up front. `getByText` throws on duplicate matches, and
  duplicate text is common by design here (an animated overlay pair
  mid-cross-fade, an invisible measurement probe rendering the same
  label as what's visible) — don't discover this after the fact.
- A `useEffect` cleanup that stops a running `Animated.timing`/
  `Animated.CompositeAnimation` on unmount isn't optional polish — a
  test that triggers one and doesn't let it finish will leak a timer
  past Jest's teardown and print `ReferenceError: ... torn down` noise
  (harmless to the exit code, but real signal that something isn't
  cleaned up). Don't reach for `jest.useFakeTimers()` to paper over this
  in one test — it bled into unrelated tests the one time it was tried
  here; fix the leak at the source instead.
- `patches/react-native-render-html+6.3.4.patch` is applied via
  `patch-package` on `postinstall`. If a dependency reinstall ever wipes
  out an expected behavior in rendered HTML content, check here before
  assuming the library changed.
- `require("@/assets/...")` (image assets, not source) needs its own
  entry in `package.json`'s `jest.moduleNameMapper`
  (`"^@/assets/(.*)$": "<rootDir>/assets/$1"`) - jest-expo auto-derives a
  mapping for `@/*` from `tsconfig.json`'s `paths`, but only picks up the
  general `@/*` -> `src/*` entry, not the more specific `@/assets/*` ->
  `assets/*` one also declared there. `app-tabs.tsx` had been
  `require()`-ing an asset this way for a while with no test ever
  exercising it, so this only surfaced once a *tested* component
  (`app-header.tsx`) needed the same asset - if a new component that
  `require()`s something under `assets/` suddenly fails jest with
  "Could not locate module... mapped as .../src/$1", this is why.

## Hard-won `Animated` / `onLayout` / layout lessons

These are all things that took multiple failed attempts to get right in
this exact codebase. Read this before touching anything similar.

- **`KeyboardAvoidingView`'s `"padding"` behavior overwrites your own
  `paddingBottom`.** Its render internally does
  `StyleSheet.compose(style, { paddingBottom: bottomHeight })` — RN style
  arrays are last-write-wins on a shared key, so any custom
  `paddingBottom` passed in `style` gets silently replaced by the
  keyboard-driven value (0 when the keyboard is closed). If you need to
  reserve space for something else (a tab bar, etc.) *underneath* a
  `KeyboardAvoidingView`, put that padding on a separate outer `View`
  wrapping it — never on the `KeyboardAvoidingView`'s own `style`.
- **`useSafeAreaInsets().bottom` does not include the native tab bar's
  own height.** `expo-router/unstable-native-tabs`' `NativeTabs` exposes
  no JS API to measure itself. Add the platform's standard tab-bar
  content height on top of the inset (`Platform.select({ ios: 49,
  android: 56, default: 0 })`), don't replace the inset with it.
- **A `ScrollView` needs an explicit `style={{ flex: 1 }}`, not just
  `contentContainerStyle`, to actually be constrained by its parent.**
  Without it, `onLayout` measurements on the ScrollView itself are
  unreliable.
- **Measuring invisible content via a hidden `onLayout` probe works, but
  where you put it matters more than it looks.** The pattern: render an
  off-screen clone wrapped in `{ height: 0, overflow: "hidden" }` (clipping
  is paint-time, not layout-time, so `onLayout` still reports the true
  un-clipped size). Real pitfalls hit doing this in practice:
  - Two probes sharing one column-direction wrapper get silently
    stretched to the **same** resolved width by that wrapper's default
    `alignItems: "stretch"` — give each probe its own `alignSelf:
    "flex-start"`, or better, don't share a wrapper at all.
  - Never nest a measurement probe inside an ancestor whose own size is
    itself animated/changing (e.g. a shrinking `Animated.View`). It may
    measure correctly on first mount and silently go wrong after the
    ancestor's size changes once. Lift the measurement state and probes
    up and out to a sibling of whatever's animating, not a descendant of
    it — this was worth doing even though it wasn't provably the bug
    without a real device, because it removes the entire class of
    interaction rather than one hypothesized cause of it.
  - `position: "absolute"` *does* still self-measure via `onLayout` in
    principle, but prefer `opacity: 0` over `height: 0 +
    overflow: "hidden"` for an absolutely-positioned probe — the latter
    can constrain what it's measuring; the former is purely paint-time.
- **RN's default `flexShrink` is `0`, not `1` like web CSS.** Don't
  assume a child will compress to fit a shrinking parent — it won't,
  unless it (or something in its chain) explicitly opts in.
- **Animating `width` (or any layout property) requires
  `useNativeDriver: false`.** The native driver can't touch layout
  props; everything still runs once per frame on the JS thread via
  `scrollEventThrottle`, which is fine for this.
- **Native `onScroll` events are not guaranteed to keep firing during a
  *programmatic* animated `scrollTo()`** on every platform. If some
  other `Animated.Value` (or plain state) is meant to track scroll
  position and you trigger a scroll yourself (e.g. a "scroll to top"
  button), drive that value explicitly (`Animated.timing`) alongside the
  `scrollTo` call — don't assume the real scroll event will do it for
  you.
- **Cross-script text vertical-centering** (Devanagari/Tamil/Telugu/etc.
  vs. Latin): a fixed-size circular button correctly centered via
  flexbox can still show visibly off-center glyphs, because different
  scripts' line-box metrics differ. A generous custom `lineHeight`
  (noticeably larger than `fontSize`, not equal to it — equal clips tall
  scripts' ascenders/matras) plus, on Android only,
  `includeFontPadding: false` + `textAlignVertical: "center"` is the
  fix that's held up here. `numberOfLines={1}` truncating to `"X…"` is a
  good diagnostic sign the container is narrower than intended, not
  necessarily that the text itself is wrong.
- **Density-specific image assets matter.** A plain unsuffixed image is
  resolved as `@1x`, so its raw pixel dimensions become its reported
  *point* size — a 260×260 PNG with no `@2x`/`@3x` siblings reports as
  260pt, roughly 10x a typical ~25pt tab-icon convention, and can look
  stretched/distorted independent of whether the source art itself is
  correct. Generate real `@1x`/`@2x`/`@3x` variants at the actual target
  point size.
- **`LayoutAnimation` needs an explicit opt-in on Android**
  (`UIManager.setLayoutAnimationEnabledExperimental(true)`) — iOS has it
  enabled by default. Do this once at module load, not per-call.

## Repo state

- This is **not currently a git repository** (no `.git`). There's no
  commit history to lean on for "what changed" or to revert against —
  be extra careful with anything destructive, and mention to the user if
  `git init` would help before doing something that's hard to undo by
  hand.
