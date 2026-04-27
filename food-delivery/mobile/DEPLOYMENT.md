# FeastFleet Android — Build & Deployment Guide

## Project Structure

```
food-delivery/mobile/
├── src/                          # Next.js source code
│   ├── pages/                    # File-based routing
│   ├── components/               # React components
│   ├── context/                  # Auth, Cart, Location contexts
│   ├── firebase/                 # Firebase config & services
│   ├── lib/                      # Capacitor plugin wrappers
│   ├── hooks/                    # Custom hooks
│   └── styles/                   # Global CSS
├── android/                      # Native Android project
│   └── app/build/outputs/apk/    # Built APKs
├── next.config.js                # Next.js config (static export)
├── capacitor.config.ts           # Capacitor config
└── package.json
```

---

## Quick Start (Development)

### 1. Install Dependencies

```bash
cd food-delivery/mobile
npm install --legacy-peer-deps
```

### 2. Run Development Server

```bash
npm run dev
```

Opens at `http://localhost:3000`. The app works in browser with web fallbacks for all native plugins.

### 3. Build & Sync to Android

```bash
npm run build          # Static export to `out/`
npx cap sync android   # Copy web assets to Android project
```

---

## Building the APK

### Debug APK (Testing)

```powershell
$env:ANDROID_HOME = "C:\Users\mradu\AppData\Local\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cd android
./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Install on Device

```powershell
# Via ADB
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or copy APK to device and install manually
```

### Open in Android Studio

```bash
npx cap open android
```

---

## Release Build (Play Store)

### 1. Generate Signing Keystore

```bash
cd android
keytool -genkey -v -keystore feastfleet-release.keystore -alias feastfleet -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Configure Signing

Create `android/keystore.properties`:

```properties
storeFile=feastfleet-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=feastfleet
keyPassword=YOUR_KEY_PASSWORD
```

### 3. Build Release AAB

```powershell
$env:ANDROID_HOME = "C:\Users\mradu\AppData\Local\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Environment Variables

Create `.env.local` in `food-delivery/mobile/`:

```env
# API Backend
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api

# Firebase (already configured in firebase/config.js)
# Add other secrets here
```

---

## Native Plugins Included

| Plugin | Purpose |
|--------|---------|
| `@capacitor/app` | Hardware back button, app state |
| `@capacitor/clipboard` | Native clipboard access |
| `@capacitor/preferences` | Secure key-value storage |
| `@capacitor/share` | Native share sheet |
| `@capacitor/splash-screen` | Launch splash screen |
| `@capacitor/status-bar` | Status bar styling |

---

## Troubleshooting

### JAVA_HOME not set

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
```

### ANDROID_HOME not set

```powershell
$env:ANDROID_HOME = "C:\Users\mradu\AppData\Local\Android\Sdk"
```

### Gradle wrapper issues

```bash
cd android
./gradlew clean
```

### Sync issues after code changes

```bash
npm run build
npx cap sync android
```

---

## Architecture Notes

- **Next.js Pages Router** with static export (`output: 'export'`)
- **Dynamic routes** use query params (`?id=xxx`) due to static export limitations
- **Capacitor bridge** provides native functionality with web fallbacks
- **Firebase** initialized with SSR safety checks
- **AuthContext** uses Capacitor Preferences on native, localStorage on web

