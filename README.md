# CaliLog

A fitness tracker for **Calisthenics** and **Gymnastics** strength training. Built offline-first with optional cloud backup and an AI training assistant.

## Download App

Don't want to build it yourself? You can download the ready-to-use Android APK directly from itch.io:

[![Download on itch.io](https://img.shields.io/badge/Download_on-itch.io-fa5c5c?style=for-the-badge&logo=itch.io)](https://ittology.itch.io/calilog)

## Features

- **3-Session Rule** — progression engine that suggests when to level up a movement after 3 consecutive successful sessions
- **AI assistant** — chat with your training data via Google Gemini or Groq
- **Google Drive backup** — optional auto-sync, no server or account required beyond your own Google account
- **Offline first** — the entire app works without an internet connection

## Tech Stack

- React Native + Expo (TypeScript, strict mode)
- Zustand for state management
- AsyncStorage for local persistence
- Victory Native for charts

---

## Prerequisites

Make sure you have the following installed before you start:

- [Node.js](https://nodejs.org/) (v18 or later)
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli`
- [EAS CLI](https://docs.expo.dev/eas/) (only needed for building APKs): `npm install -g eas-cli`

---

## Getting Started

```bash
git clone https://github.com/ittology/CaliLog.git
cd CaliLog
npm install
npx expo start
```

---

## Building an APK

There are two ways to build a release APK. The SHA-1 fingerprint you need for Google Drive OAuth (see below) depends on which method you use.

### Option 1: EAS Cloud Build (recommended)

EAS builds the APK on Expo's servers. Free tier allows a limited number of builds per month.

```bash
npx eas-cli build --platform android --profile preview
```

The build will run in the cloud and produce a downloadable `.apk` file.

### Option 2: Local Build

Requires the Android SDK and JDK installed locally. Useful if you have hit your EAS free tier limit or want a fully offline workflow.

```bash
npx eas-cli build --platform android --profile preview --local
```

### Getting your SHA-1 fingerprint

The SHA-1 fingerprint is required when setting up Google Drive OAuth credentials (Step 3 of the Google Drive setup below).

**If you use EAS Cloud Build:**

```bash
npx eas-cli credentials
```

Select **Android**, then select your build profile (e.g. `preview`). The SHA-1 fingerprint is listed under the keystore details.

**If you use a local build:**

After the first local build, a keystore file is generated. Run:

```bash
keytool -list -v -keystore ./android/app/release.keystore
```

Copy the `SHA1` value from the output.

> **Note:** the SHA-1 fingerprint is tied to the keystore used for the build. If you switch between EAS Cloud and a local keystore, you will need a different OAuth client ID for each.

---

## Optional: AI Assistant

The assistant supports Google Gemini and Groq. Both providers are free to use. Groq has the most generous rate limits; Gemini has the best model quality.

### Getting a Gemini API key

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API key** and copy it

Recommended model: `gemini-2.5-flash-preview` — see [all available Gemini models](https://ai.google.dev/gemini-api/docs/models)

### Getting a Groq API key

1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Sign in or create a free account
3. Click **Create API Key** and copy it

Recommended model: `openai/gpt-oss-120b` — see [all available Groq models](https://console.groq.com/docs/models)

### Configuring the assistant

1. Open the app and go to **Profile → Assistant**
2. Paste your API key into the matching provider card (Google or Groq)
3. Enter the model name(s) in the **Models** field, comma-separated
4. The model you enter here will appear in the dropdown on the AI tab
5. Optionally add a personal context (age, weight, goals, injuries) to personalize responses

API keys are stored locally on your device and are never sent anywhere except directly to the respective API endpoint and Google Drive when auto-sync is enabled.

---

## Optional: Google Drive Backup

Backup requires a Google Cloud project and an OAuth 2.0 client ID. This is a one-time setup.

### Step 1 — Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown at the top and select **New Project**
3. Give it a name (e.g. `CaliLog Backup`) and click **Create**

### Step 2 — Enable the required APIs

1. Select your new project and search for **Google Drive API**
2. Click on it and enable it

### Step 3 — Get your SHA-1 fingerprint

Follow the instructions in the [Building an APK](#building-an-apk) section above to get your SHA-1 fingerprint before continuing.

### Step 4 — Create an OAuth 2.0 client ID

1. In the left sidebar, open the navigation menu (three lines, top left)
2. Go to **APIs & Services → Credentials**
3. If prompted, complete the OAuth consent screen setup:
   - App name: `CaliLog`
   - All email fields: [YOUR_EMAIL_ADDRESS]
   - User type: **External**
   - Click **Create**
4. On the left sidebar, click **Audience** (or **Target Audience**)
5. Click **Add users** and enter your Google account email address
6. Go back to **Overview**, click **Create OAuth Client** and fill in:
   - Type: **Web application**
   - Name: `CaliLog Web Client`
   - Click **Create**
7. Create a second OAuth Client:
   - Type: **Android**
   - Name: `CaliLog Android Client`
   - Package name: `com.calilog.app`
   - SHA-1 fingerprint: your SHA-1 from Step 3
   - Click **Create**
8. Copy the **Client ID** from the **Web Client** (ends in `.apps.googleusercontent.com`)

### Step 5 — Connect in the app

1. Open the app and go to **Settings → Cloud Backup**
2. Paste your **Web Client ID** into the field
3. Tap **Connect Google Drive** and sign in with the same Google account you added as a test user

After connecting, you can trigger a manual backup or enable **Auto Backup** to sync all changes automatically.

---

## License

MIT — see [LICENSE](LICENSE).

---

Created by [ITTOLOGY](https://www.youtube.com/@ITTOLOGY)
