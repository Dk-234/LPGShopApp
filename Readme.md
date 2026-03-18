# LPG Shop App (LPG MAP)

React Native + Expo application for LPG distributor workflow management: customer records, bookings, delivery/payment tracking, cylinder inventory, stove rental, and data export.

## What This App Does

This app is designed for an LPG shop owner/operator to run day-to-day operations from one mobile app.

Core business areas:
- Customer onboarding and profile management
- Cylinder booking and delivery lifecycle tracking
- Payment status and customer transaction history
- Full/empty cylinder inventory tracking by type
- Stove stock, renting, return, and rent history
- CSV-style data export/share

The app uses Firestore as the backend and stores business data in user-scoped records (via `userPhone` field).

## How The App Works

### 1) Login and Session
- User logs in with `phone + 6-character PIN`.
- New users are created in Firestore `users` collection.
- Session state is saved in AsyncStorage.
- Auto-login is allowed for up to 72 hours, then login is required again.

### 2) Dashboard
- Shows a live summary:
	- total customers
	- unpaid/paid/partial bookings
	- today/near-term pending deliveries
	- domestic/commercial/subsidy counts
- Quick actions route to add customer, view customer list, and quick booking.
- Hidden feature: tapping the Welcome title multiple times opens the cylinder price editor.

### 3) Customer Management
- Add customer with validation:
	- required name and 10-digit phone
	- domestic customer requires unique book ID
	- phone uniqueness checks
- View/search/filter customers by category and subsidy.
- Customer details modal includes payment history and quick booking action.
- Edit and delete customer supported.

### 4) Booking Flow
- Booking is tied to selected customer.
- Validations include:
	- DAC number must be 4 digits
	- cylinder count/type must match registered customer profile
	- delivery date cannot be in the past
- Payment statuses: Pending, Partial, Paid.
- Total amount calculation = cylinder price + service fee.
- Service fee configuration is user-editable and saved for future bookings.
- Optional empty cylinder receipt updates inventory accordingly.

### 5) Booking List and Fulfillment
- Filters by delivery status, payment status, and date window.
- Update modal allows payment/delivery state changes.
- Inventory deduction occurs on delivery completion (`FULL` cylinders reduced).
- Insufficient stock warning appears before delivery completion.
- Completed bookings (`Paid + Delivered`) are locked and auto-removed after ~20 hours.

### 6) Inventory and Stove Rentals
- Cylinder operations:
	- add stock
	- remove stock
	- move full cylinders to empty
- Stove operations:
	- add stove
	- rent to customer
	- return stove
- Rent history is tracked with payment status and auto-cleanup logic (28-day window after return).

### 7) Export
- Export/share customer data in CSV-like format.
- Individual customer sharing includes recent transaction history.

## Tech Stack

### Frontend
- React 19
- React Native 0.79
- Expo SDK 53
- React Navigation (native stack)
- React Native Safe Area Context
- React Native Picker
- React Native DateTimePicker

### Backend / Data
- Firebase Firestore
- Firebase Web SDK (`firebase`)

### Device / Storage
- AsyncStorage (session persistence)
- React Native Keychain (compatibility/fallback logic present)

### Build / Tooling
- Expo CLI / Metro
- EAS Build (`eas.json` profiles: development, preview, production)
- Babel (`babel-preset-expo`)

## Important Project Files

- `App.js`: app shell, auth gating, navigator, add/edit customer screens
- `AuthContext.js`, `useAuth.js`, `auth.js`: session/auth orchestration
- `dataService.js`: Firestore operations and user-scoped data access
- `DashboardScreen.js`: KPI overview and price management
- `BookingScreen.js`: booking creation and pricing/service-fee logic
- `BookingsListScreen.js`: booking updates, delivery completion, auto-cleanups
- `CustomersListScreen.js`: customer list, filters, details, payment history
- `InventoryScreen.js`: stock + stove renting operations and history
- `ExportScreen.js`: CSV/share flows
- `firebaseConfig.js`: Firebase project config
- `firestore.rules`: Firestore security rules

## Firestore Data Model (Current)

Primary collections used by the app:
- `users`
- `customers`
- `bookings`
- `cylinders`
- `stoves`
- `lendingRecords`

Most collections use `userPhone` for tenant-style data isolation.

## Prerequisites

Install before running:
- Node.js LTS (18 or 20 recommended)
- npm (comes with Node)
- Expo CLI (via `npx expo ...`, global install optional)
- Android Studio + emulator, or a physical Android device with Expo Go
- (Optional) EAS CLI for cloud builds

## Setup and Run Commands

From project root (`LPGShopApp`):

```bash
npm install
```

Start dev server:

```bash
npm run start
```

Run targets:

```bash
npm run android
npm run ios
npm run web
```

Recommended diagnostics:

```bash
npx expo doctor
```

Clear Metro cache if needed:

```bash
npx expo start -c
```

## Firebase Setup

1. Create/select a Firebase project.
2. Enable Firestore.
3. Update `firebaseConfig.js` if you are not using the existing project.
4. Deploy Firestore rules:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:rules
```

## EAS Build Commands (Optional)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
eas build --platform android --profile production
```

## Current Features Summary

- PIN-based login with session timeout logic
- User-specific pricing and service fees
- Customer CRUD with strong input validation
- Booking lifecycle with payment + delivery status
- Auto amount calculation with configurable fee model
- Inventory updates on booking and delivery operations
- Stove renting/return with history tracking
- Search/filter views for customers and bookings
- Data export and sharing
- Dark/light theme adaptation via `useColorScheme`

## Known Limitations

- Firestore rules currently require `request.auth`, while app login is custom PIN-based; production security should align authentication and rules.
- Export flow reads all customer records directly from Firestore in its current implementation.
- PIN is app-managed and should be hardened (hashing + stronger auth flow) for production.

## Future Scope

Suggested roadmap:

1. Integrate Firebase Authentication (phone OTP) and unify with Firestore rules.
2. Hash/salt PIN or remove custom PIN in favor of token-based auth.
3. Add role-based access (owner, staff, delivery person).
4. Add push notifications/reminders for upcoming deliveries.
5. Introduce offline-first sync and conflict handling.
6. Add billing/invoice PDF generation and WhatsApp sharing.
7. Build analytics dashboards (revenue, churn, refill cadence).
8. Add automated tests (unit + integration + E2E).
9. Add CI/CD pipeline (lint, build, smoke checks).
10. Improve data export to real file download/storage targets.

## Scripts Available

From `package.json`:
- `npm run start`
- `npm run android`
- `npm run ios`
- `npm run web`

## License

0BSD (as currently defined in `package.json`).
