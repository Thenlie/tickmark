This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Project

Tickmark lets climbers record new rock climbs and submit them to [OpenBeta](https://openbeta.io).

### Platforms: iOS and Android only

- There is no web target. Do not add `.web.tsx`/`.web.ts` files, web-only CSS, `react-native-web`, `react-dom`, or `web` config in `app.json`.
- Cross-platform means iOS and Android. Use `Platform.OS === 'ios' | 'android'` checks or `.ios.tsx`/`.android.tsx` files when behavior must differ.

### Offline first

Users usually record climbs at the crag, where they often have no signal. Assume the device is offline while data is being collected.

- Every data-entry flow (drafting a climb, adding photos, editing, saving) must work fully offline. Never block the UI on a network request or show an error just because the device is offline.
- Persist user input to on-device storage as it is entered so nothing is lost if the app is closed or killed.
- Store photos as local files and reference them by local URI until upload.
- Network access is only needed to send data out (e.g. submitting to OpenBeta). Queue submissions locally and send them when a connection is available. Make retries safe so a submission is never duplicated or lost, and show the user each item's sync status (draft, pending, submitted, failed).
- Treat remote data (e.g. OpenBeta areas or grades) as an optional cache: read from local storage first and refresh in the background when online.

### Prefer Expo

- When a need is covered by an Expo SDK package (`expo-*`), use it instead of a third-party library. Examples: `expo-image`, `expo-image-picker`, `expo-file-system`, `expo-sqlite`, `expo-network`, `expo-location`.
- Follow Expo's conventions and recommendations (Expo Router, Continuous Native Generation, config plugins, EAS) rather than custom or bare React Native setups.
- Reach for a non-Expo library only when no Expo package fits, and prefer ones listed as compatible in the Expo docs.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Check your available skills before adding dependencies, and follow "Prefer Expo" above. Docs: https://docs.expo.dev/versions/latest/index.md
