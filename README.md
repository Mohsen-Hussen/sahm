<div align="center">

# Malaab · ملاعب

**A bilingual (Arabic / English) sports-court booking app built with React Native, Expo and TypeScript.**

iOS · Android · Web from one codebase · Real RTL · Slot availability and pricing rules · Tested

[![CI](https://github.com/Mohsen-Hussen/malaab/actions/workflows/ci.yml/badge.svg)](https://github.com/Mohsen-Hussen/malaab/actions/workflows/ci.yml)
![Expo](https://img.shields.io/badge/Expo_SDK-58-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.88-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

**[▶ Live web demo](https://mohsen-hussen.github.io/malaab/)**

| Explore (AR)                                                                             | Pick a slot (EN)                                                                            | Confirmed (AR)                                                                                   | My bookings (EN)                                                                  |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| <img src="docs/screenshots/explore-ar.png" alt="Explore screen in Arabic" width="200" /> | <img src="docs/screenshots/venue-en.png" alt="Venue slots and price summary" width="200" /> | <img src="docs/screenshots/confirmed-ar.png" alt="Booking confirmation in Arabic" width="200" /> | <img src="docs/screenshots/bookings-en.png" alt="My bookings list" width="200" /> |

</div>

## About

Malaab lets players find a football, padel, basketball or tennis court, pick a day, a duration and a start time, and book in a few taps. It is a demo, so all venues, prices and availability are fictional. I built it to show how I structure a production-style Expo app: file-based routing, a clean domain layer, persisted state, a real Arabic-first RTL layout, and tests at both the logic and screen level.

## Features

- **Explore.** Search in Arabic or English, filter by sport and city, and see a live result count.
- **Venue page.** Opening hours, amenities, a 7-day date strip, a 60/90/120-minute duration choice and a start-time grid.
  - A start time is disabled if it has already passed, runs past closing time, or overlaps another booking (other players' demo bookings or your own).
- **Pricing.**
  - Prices are per minute, so a 17:30–19:00 game pays the 25% evening rate only for the 60 minutes after 18:00.
  - VAT is 15%, and every amount is stored in integer halalas to avoid rounding errors.
- **Booking.**
  - Confirmation screen with a booking code.
  - "My bookings" is split into upcoming and past.
  - Free cancellation until 24 hours before the start time.
- **Arabic / English with real RTL.**
  - The app follows the device language and can be switched in Settings.
  - On iOS/Android the layout flips through `I18nManager`, with an app reload.
  - On the web, `dir` and `lang` change instantly.
  - Time ranges use wording that reads correctly in both directions.
- **Persistence.** Bookings and the chosen language survive restarts (Zustand + AsyncStorage).
- **Accessibility.** Buttons, chips and time slots expose their role, label and state (`selected` / `disabled`) to screen readers.

## Tech stack

| Area       | Choice                                                                                  |
| ---------- | --------------------------------------------------------------------------------------- |
| Framework  | Expo SDK 58 · React Native 0.88 · React 19                                              |
| Navigation | Expo Router (stack + tabs, typed routes, modal confirmation)                            |
| State      | Zustand 5 with `persist` + AsyncStorage                                                 |
| i18n       | `expo-localization` · typed dictionaries · `I18nManager` / `dir` for RTL                |
| Testing    | Jest 30 · `jest-expo` · React Native Testing Library 14 · `expo-router/testing-library` |
| Quality    | TypeScript (strict) · ESLint (`eslint-config-expo`) · Prettier · GitHub Actions         |
| Web        | `react-native-web`, exported with `expo export -p web` to GitHub Pages                  |

## Project structure

```
src/
├── app/                        # Expo Router screens (file-based routes)
│   ├── _layout.tsx             # root stack, locale/direction provider
│   ├── (tabs)/                 # Explore · My bookings · Settings
│   ├── venue/[id].tsx          # day, duration and slot picker + price summary
│   └── booking/[id].tsx        # confirmation / booking details (modal)
├── features/
│   ├── venues/data.ts          # venues, sports, cities, search & filters
│   └── booking/
│       ├── slots.ts            # availability, overlap, pricing, cancellation rules
│       └── store.ts            # persisted bookings store
├── i18n/                       # strings (AR/EN), language store, RTL switching
├── components/                 # Button, Chip, Card, VenueCard, icons
└── theme/                      # colors, spacing, radii
__tests__/                      # unit tests + router-level screen tests
```

The booking rules (`slots.ts`) are plain TypeScript with no React or React Native imports, so they are easy to test and could be shared with a backend.

## Getting started

Requires Node.js 20+.

```bash
git clone https://github.com/Mohsen-Hussen/malaab.git
cd malaab
npm install
npx expo start          # press i (iOS), a (Android) or w (web), or scan the QR code with Expo Go
```

| Script               | What it does                              |
| -------------------- | ----------------------------------------- |
| `npm start`          | Start the Expo dev server                 |
| `npm test`           | Run the Jest suite                        |
| `npm run lint`       | `expo lint`                               |
| `npm run typecheck`  | `tsc --noEmit`                            |
| `npm run format`     | Format with Prettier                      |
| `npm run export:web` | Build the static web version into `dist/` |

> Switching the language on iOS/Android reloads the app so React Native can flip the layout direction. In Expo Go, direction overrides are reset by Expo Go itself; use a development build to try them on a device.

The live demo is built by [`pages.yml`](.github/workflows/pages.yml) with `EXPO_BASE_URL=/malaab`, which [`app.config.ts`](app.config.ts) maps to Expo's `experiments.baseUrl`. A `404.html` copy lets deep links work on GitHub Pages.

## Testing

There are 20 tests:

- **Booking rules:** opening and closing times, overlaps, past times, the user's own bookings, deterministic demo availability, peak pricing split by minute, VAT, the 24-hour cancellation window and SAR formatting.
- **Data and store:** bilingual search and filters, booking and cancelling, the user's taken time ranges, and splitting bookings into upcoming and past.
- **Translations:** Arabic and English have the same keys and the same `{placeholders}`.
- **Screens (Expo Router testing library):** filtering the venue list, and the full flow from choosing a day and slot to the stored booking and confirmation screen.

## License

[MIT](LICENSE) © Mohsen Hussein
