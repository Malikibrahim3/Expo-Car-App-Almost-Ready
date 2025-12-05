# CarValue Tracker - Deployment Readiness Plan

## Overview
This document outlines all tasks needed to make the app deployment-ready, organized by what can be done immediately vs. what requires credentials.

---

## Phase 1: Immediate Fixes (No Credentials Needed)

### 1.1 ✅ Error Boundary & Crash Handling - DONE
- [x] Create ErrorBoundary component to catch React errors
- [x] Add fallback UI for crashed screens
- [x] Wrapped app in ErrorBoundary in _layout.tsx

### 1.2 ✅ Fix Version Mismatch - DONE
- [x] Sync version numbers between package.json and app.json (both now 1.0.0)

### 1.3 ✅ Hide/Fix "Coming Soon" Features - DONE
- [x] Market tab already hidden (href: null)
- [x] "See What Dealers Will Pay" now navigates to sell-options instead of showing toast

### 1.4 ✅ Demo Mode Fixes - DONE
- [x] Demo mode now stores cars locally only (not to Supabase)
- [x] Added DEMO_USER_ID check in addCar, updateCar, deleteCar

### 1.5 ✅ Offline Support - DONE
- [x] Created useNetworkStatus hook for connectivity detection
- [x] Created OfflineIndicator component
- [x] Added OfflineIndicator to root layout

### 1.6 ✅ API Rate Limiting - DONE
- [x] Created apiRateLimiter utility with exponential backoff
- [x] Integrated rate limiter into valuationService

### 1.7 ✅ Privacy Policy & Terms Pages - DONE
- [x] Created privacy-policy.tsx screen
- [x] Created terms-of-service.tsx screen
- [x] Added links in profile/settings page
- [x] Added terms agreement text on signup page

### 1.8 ✅ Email Verification UI - DONE
- [x] Created verify-email.tsx screen
- [x] Added resend verification email functionality
- [x] Signup now redirects to verify-email when confirmation needed

### 1.9 ✅ Environment Variables Setup - DONE
- [x] Updated valuationService to use env vars for API keys
- [x] Updated .env.example with all required variables

---

## Phase 2: Requires Your Input (Credentials/Decisions)

### 2.1 🔑 Crash Reporting Service (Sentry) - OPTIONAL
**What you need to provide:**
- Sentry DSN (create free account at sentry.io)
- Or choose alternative: Bugsnag, Crashlytics

**How to set up:**
1. Go to sentry.io and create a free account
2. Create a new React Native project
3. Copy the DSN
4. Add to .env: `EXPO_PUBLIC_SENTRY_DSN=your_dsn`
5. Install: `npx expo install @sentry/react-native`

### 2.2 🔑 Analytics Service - OPTIONAL
**What you need to provide:**
- Choose service: Amplitude, Mixpanel, PostHog, or Expo Analytics
- API key for chosen service

### 2.3 🔑 Push Notifications - OPTIONAL FOR MVP
**What you need to provide:**
- Expo push notification credentials (auto-generated when you run `eas build`)
- Apple Push Notification key (for iOS production) - from Apple Developer account
- Firebase Cloud Messaging key (for Android) - from Firebase console

### 2.4 📝 Legal Documents Content - TEMPLATES PROVIDED
**Status:** Basic templates created in app. You should:
- Review and customize the privacy policy text
- Review and customize the terms of service text
- Update contact email addresses in both files
- Consider having a lawyer review before launch

**Files to update:**
- `app/(app)/privacy-policy.tsx` - Update CONTACT_EMAIL and review content
- `app/(app)/terms-of-service.tsx` - Update CONTACT_EMAIL and review content

### 2.5 🎨 App Store Assets - REQUIRED FOR SUBMISSION
**What you need to provide:**
- App icon (1024x1024 PNG, no transparency, no rounded corners)
- Splash screen design
- App Store screenshots (various sizes for different devices)
- App description text (short and long)
- Keywords for App Store search
- Support URL
- Privacy Policy URL (can use in-app page or host externally)

### 2.6 🔑 API Key Security - RECOMMENDED
**Current status:** API keys are in code with env var fallback
**Options:**
1. Keep as-is for MVP (acceptable for initial launch)
2. Create a simple backend proxy (more secure, recommended for scale)

---

## ✅ COMPLETED - Files Created/Modified

### New Files Created:
- ✅ `src/components/ErrorBoundary.tsx` - Catches React errors
- ✅ `src/components/OfflineIndicator.tsx` - Shows offline banner
- ✅ `src/hooks/useNetworkStatus.ts` - Network connectivity hook
- ✅ `src/utils/apiRateLimiter.ts` - API rate limiting with backoff
- ✅ `app/(app)/privacy-policy.tsx` - Privacy policy screen
- ✅ `app/(app)/terms-of-service.tsx` - Terms of service screen
- ✅ `app/(auth)/verify-email.tsx` - Email verification screen

### Files Modified:
- ✅ `app/_layout.tsx` - Added ErrorBoundary and OfflineIndicator
- ✅ `app/(app)/_layout.tsx` - Added routes for privacy/terms
- ✅ `app/(app)/car-detail.tsx` - Fixed Coming Soon button
- ✅ `app/(tabs)/profile.tsx` - Added privacy/terms links
- ✅ `app/(auth)/signup.tsx` - Added terms agreement, verify-email redirect
- ✅ `src/context/CarContext.js` - Demo mode fix (local storage only)
- ✅ `src/services/valuationService.js` - Rate limiting, env vars
- ✅ `package.json` - Version synced to 1.0.0
- ✅ `.env.example` - Documented all env vars

---

## 🚀 Ready for TestFlight/Internal Testing

The app is now ready for internal testing. Before App Store submission:

1. **Test thoroughly** on real devices
2. **Update legal docs** with your actual company info
3. **Create app icons** and screenshots
4. **Set up EAS Build** for production builds
5. **Optional:** Add Sentry for crash reporting

### Quick Start for Testing:
```bash
# Install dependencies
npm install

# Start development
npx expo start

# Build for iOS TestFlight
eas build --platform ios --profile preview

# Build for Android Internal Testing
eas build --platform android --profile preview
```
