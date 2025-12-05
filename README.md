# 🚗 CarValue Portfolio Tracker

> A modern vehicle portfolio tracking application built with React Native and Expo

## ✨ Features

- 📱 **Cross-Platform** - iOS, Android, and Web support via Expo
- 🎨 **Modern UI** - Clean, Linear-inspired design system
- 💰 **Value Tracking** - Monitor your vehicle's market value
- 📊 **Equity Analysis** - Track positive/negative equity positions
- 🔔 **Smart Notifications** - Get alerts when it's optimal to sell
- 🌙 **Dark/Light Mode** - Seamless theme switching

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI

### Installation

```bash
# Install dependencies
npm install

# Start Expo development server
npx expo start
```

### Running on Devices

```bash
# iOS Simulator
npx expo run:ios

# Android Emulator
npx expo run:android

# Web Browser
npx expo start --web
```

## 📁 Project Structure

```
├── app/                 # Expo Router screens
│   ├── (app)/          # Authenticated app screens
│   ├── (auth)/         # Authentication screens
│   ├── (tabs)/         # Tab navigation screens
│   └── _layout.tsx     # Root layout
├── src/
│   ├── components/     # Reusable UI components
│   ├── context/        # React context providers
│   ├── constants/      # Design system constants
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Core libraries (Supabase)
│   ├── services/       # API and data services
│   ├── theme/          # Theme configuration
│   ├── types/          # TypeScript types
│   └── utils/          # Utility functions
├── landing/            # Marketing landing page (Vite)
├── android/            # Android native code
└── ios/                # iOS native code
```

## 🎨 Design System

Built with a Linear-inspired design system featuring:
- Consistent spacing scale (4px base)
- Typography hierarchy
- Color palette with dark/light variants
- Reusable iOS-style components

## 🔧 Environment Setup

Create a `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## 💳 Subscription System

The app implements a hybrid refresh strategy with two tiers:

### Free Plan
- Track 1-2 vehicles
- Automatic weekly value updates
- 1 manual refresh per 7 days
- Basic equity alerts

### Pro Plan ($4.99/month)
- Unlimited vehicles
- Daily updates for up to 10 cars
- Weekly updates for additional cars
- 1 manual refresh per day (any car)
- Priority refresh queue
- Market shift alerts

### Market Shift Detection
The system automatically detects significant market movements (±1.5%+) and triggers extra refreshes for affected vehicles.

### Database Setup

Run the subscription tables migration:
```bash
# In Supabase SQL Editor
scripts/create-subscription-tables.sql
```

### Scheduled Refresh Job

Set up a cron job to run automated refreshes:
```bash
# Run manually
npx ts-node scripts/scheduledRefreshJob.ts

# Or deploy as Supabase Edge Function / Vercel Cron
```

### Testing

```bash
node scripts/testSubscriptionSystem.js
```

## 📱 Landing Page

The marketing landing page is in the `/landing` directory:

```bash
cd landing
npm install
npm run dev
```

## 📄 License

MIT License
