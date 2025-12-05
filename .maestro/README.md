# Maestro E2E Tests for CarValue Tracker

## Installation (one-time)

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

After install, restart your terminal or run:
```bash
export PATH="$PATH:$HOME/.maestro/bin"
```

## Running Tests

### Prerequisites
1. Have iOS Simulator running with Expo Go installed
2. Start your app: `npx expo start`
3. Press `i` to open in iOS Simulator

### Run all flows
```bash
maestro test .maestro/flows/
```

### Run the complete app test
```bash
maestro test .maestro/flows/complete-app-flow.yaml
```

### Run specific flows
```bash
# Auth flows
maestro test .maestro/flows/signup-flow.yaml
maestro test .maestro/flows/login-flow.yaml
maestro test .maestro/flows/onboarding-flow.yaml
maestro test .maestro/flows/plan-selection-flow.yaml

# Main app flows
maestro test .maestro/flows/garage-management-flow.yaml
maestro test .maestro/flows/car-detail-flow.yaml
maestro test .maestro/flows/settings-flow.yaml
maestro test .maestro/flows/deals-flow.yaml
maestro test .maestro/flows/market-flow.yaml
maestro test .maestro/flows/activity-flow.yaml
```

### Interactive mode (great for writing tests)
```bash
maestro studio
```

## Test Coverage

| Flow | Description |
|------|-------------|
| `complete-app-flow.yaml` | Full app journey: landing → all tabs |
| `signup-flow.yaml` | Account creation with validation |
| `login-flow.yaml` | Sign in flow |
| `onboarding-flow.yaml` | New user onboarding steps |
| `plan-selection-flow.yaml` | Free vs Pro plan selection |
| `garage-management-flow.yaml` | Add/view/manage vehicles |
| `car-detail-flow.yaml` | Vehicle detail screen & chart |
| `settings-flow.yaml` | All settings & preferences |
| `deals-flow.yaml` | Partner deals & filters |
| `market-flow.yaml` | Marketplace coming soon |
| `activity-flow.yaml` | Activity/notification feed |

## Switching to Dev Build

If you build a native dev client (`npx expo run:ios`), change the appId in each flow:

```yaml
# From:
appId: host.exp.Exponent  # Expo Go

# To:
appId: com.carvalue.tracker  # Dev build
```

## Writing Tests

Maestro uses simple YAML syntax. Common commands:
- `launchApp` - Start the app
- `tapOn` - Tap an element by text or id
- `inputText` - Type text into a field
- `assertVisible` - Check element is visible
- `scroll` - Scroll the screen
- `waitForAnimationToEnd` - Wait for animations
- `back` - Press back button

See full docs: https://maestro.mobile.dev/
