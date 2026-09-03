# News Khabri

An Indian news aggregator for iOS and Android. News Khabri pulls
articles from multiple Indian publishers' public RSS feeds, groups
same-event coverage across sources into a single story, and ranks
everything by a mix of source count, recency, and significance -
rather than just showing whichever publisher posted first. English plus
nine Indian languages are supported (Hindi, Gujarati, Bengali, Kannada,
Marathi, Malayalam, Tamil, Telugu, Odia).

This is the frontend (React Native + [Expo](https://expo.dev), file-based
routing via `expo-router`). The backend that does the fetching,
clustering, and ranking lives in a separate repo
(`news-khabri-backend`: Node/Express + better-sqlite3 + node-cron).

## Getting started

```bash
npm install
npx expo start
```

That prints a QR code plus options to open the app in a development
build, an Android emulator, or an iOS simulator.

### Backend API URL

The app reads `EXPO_PUBLIC_API_URL` (resolved in `src/api/config.ts`,
falling back to `http://localhost:3000`). The committed `.env` default
works for the iOS simulator and `expo start` on the same machine.
Anything else needs an untracked `.env.local`:

```bash
# Android emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
# physical device (same Wi-Fi)
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
```

Release builds set it per EAS build profile (`eas.json` → `build.<profile>.env`)
and it **must be `https`** — iOS App Transport Security blocks plaintext
`http`.

## Project structure

```
src/
  app/                  expo-router routes (file-based)
    profile.tsx          Profile screen (top-level, not a tab)
    (tabs)/
      (home)/            Top stories feed, article + story detail
      search/            Search, category browsing, article detail
      preferences/        Preferences, language picker, About/Privacy/Terms
  components/            Shared UI (cards, lists, themed primitives)
  contexts/               Theme/language/font-size/debug preference providers
  hooks/                  useTheme, useColorScheme
  api/                    Backend API client
  i18n/                   Translations (10 languages, see src/i18n/locales/)
  utils/                  Formatting, category mapping, etc.
  constants/              Design tokens (colors, spacing, radius, type scale)
```

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run android` / `ios` | Build and install a native dev client (requires Android Studio / Xcode - this is a real native build, not just starting Metro) |
| `npm test` | Run the Jest test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Lint via `expo lint` |

## Learn more about the tooling

This project is built on Expo SDK 54. If you're new to the framework:
[Expo documentation](https://docs.expo.dev/) and
[file-based routing](https://docs.expo.dev/router/introduction) are
the relevant starting points.
