# Deploying User-Specific Pricing Rules

## Overview
The pricing system has been updated to be user-specific rather than universal. Each user now has their own prices and service fees.

## Changes Made

### 1. Updated Collections Structure
- **Old**: Global `settings/prices` and `settings/serviceFees`
- **New**: User-specific `userSettings/{userPhone}_prices` and `userSettings/{userPhone}_serviceFees`

### 2. Files Modified
- `DashboardScreen.js`: Updated price loading and saving to be user-specific
- `BookingScreen.js`: Updated price and service fee loading/saving to be user-specific  
- `BookingsListScreen.js`: Updated price and service fee loading to be user-specific
- `firestore.rules`: Added security rules for the new `userSettings` collection

### 3. Security Rules
The new Firestore security rules ensure that:
- Users can only access their own pricing settings
- Document IDs follow the pattern `{userPhone}_prices` and `{userPhone}_serviceFees`
- All other collections remain user-isolated

## Deployment Steps

### 1. Deploy Firestore Security Rules
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not done)
firebase init firestore

# Deploy the new security rules
firebase deploy --only firestore:rules
```

### 2. Data Migration (Optional)
If you have existing global pricing data, you can migrate it:

1. Export existing global prices from Firebase Console
2. Create user-specific documents for each user
3. Import the data with the new document structure

### 3. Test the Changes
1. Login with different user accounts
2. Verify each user can set their own prices
3. Check that booking calculations use user-specific prices
4. Ensure no user can see another user's pricing data

## Benefits

1. **Multi-tenant**: Each shop owner has independent pricing
2. **Secure**: Users cannot access other users' pricing data
3. **Scalable**: No conflicts between different users' pricing strategies
4. **Flexible**: Each user can customize their pricing without affecting others

## Default Pricing
When a new user logs in for the first time, the system automatically creates default pricing:

**Cylinder Prices:**
- Bharat Gas: 5kg = ₹400, 14.2kg = ₹850
- HP Gas: 5kg = ₹410, 14.2kg = ₹860  
- Indane Gas: 5kg = ₹390, 14.2kg = ₹840

**Service Fees:**
- No service: ₹0
- Pickup: ₹0
- Drop: ₹0
- Pickup + Drop: ₹0

Users can customize these prices from the Dashboard screen.
