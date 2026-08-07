# AgroNexus — Mobile App

React Native + Expo mobile application for the AgroNexus smart farming management platform. Designed for field workers: offline-first data capture, batch logging, feed records, and biosecurity checks.

## Tech Stack

- **Framework:** React Native + Expo (SDK 52)
- **Language:** TypeScript
- **Navigation:** Expo Router (file-based)
- **State:** React Context + AsyncStorage (offline)
- **API:** GraphQL JWT (same backend as web)
- **Deployment:** EAS Build → App Store / Google Play

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start Expo dev server
npx expo start
```

Then press:
- `i` — open in iOS Simulator
- `a` — open in Android Emulator
- `w` — open in web browser
- Scan QR code with Expo Go app on your phone

## Environment Variables

Create a `.env` file:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8000/graphql/
```

> Use your machine's local IP (not `localhost`) so the phone/emulator can reach the backend.

## Key Features

- 📱 Offline-first: batch records saved locally, auto-sync when connected
- 🐔 Quick batch logging: mortality, feed consumption, water intake
- 💉 Biosecurity checklists and vaccination records
- 📊 Live KPI cards: FCR, mortality rate, daily costs
- 🔔 Push notification support
- 📷 AI Vision: photo capture for disease detection

## Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

See [EAS Build documentation](https://docs.expo.dev/build/introduction/) for setup.
