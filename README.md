# SIFT

A landscape-first price comparison app that streams live scraped prices and teaches you what those prices mean. Built for ID300 Theme 3.

Scraping runs server-side in Firebase Cloud Functions (React Native/Expo cannot scrape arbitrary sites from the device), split into two stages: **resolution** (which page holds the listing) and **extraction** (what's on it, via a four-tier cascade from official API down to heuristic HTML parsing). Results stream to the app through a Firestore real-time listener.

## Stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Framework | React Native via Expo |
| Navigation | Expo Router |
| State | Zustand |
| Orientation | expo-screen-orientation |
| Auth | Firebase Auth |
| Database | Cloud Firestore |
| Scraper runtime | Cloud Functions (Node) on Blaze |
| HTML parsing | Cheerio |
| Local dev | Firebase Emulator Suite in Docker |

## Project layout

```
src/
  app/          Expo Router screens
  components/    Shared UI
  lib/           Firebase client init
  store/         Zustand stores
  types/         Shared Firestore document types
functions/
  src/
    resolution/  Stage 1 - locate the listing page
    extraction/  Stage 2 - four-tier cascade to read price/title/stock
```

## Get started

1. Copy `.env.example` to `.env` and fill in your Firebase web app config.

2. Install dependencies

   ```bash
   npm install
   npm install --prefix functions
   ```

3. Start the Firebase Emulator Suite

   ```bash
   docker compose up
   ```

4. Start the app

   ```bash
   npx expo start
   ```

## Cloud Functions

```bash
cd functions
npm run build:watch   # in one terminal
npm run serve         # or use docker compose up, above
```

Deploy with `npm run deploy` from `functions/` once a Firebase project is wired up in `.firebaserc`.
