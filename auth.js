import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUser, verifyUserCredentials, updateUserPin } from './dataService';

const AUTH_SERVICE = 'com.lpgapp.auth';
const LAST_AUTH_KEY = '@lastAuthTime';
const USER_PHONE_KEY = '@userPhone';

// Check if Keychain is available
const isKeychainAvailable = async () => {
  try {
    const result = await Keychain.getSupportedBiometryType();
    return true;
  } catch (error) {
    console.log('Keychain not available, using AsyncStorage fallback');
    return false;
  }
};

// Set user PIN - now creates user in database
export const setUserPin = async (phone, pin) => {
  try {
    console.log('💾 Creating user in database for phone:', phone);
    
    // Create user in Firebase database
    await createUser(phone, pin);
    
    // Store locally for session management only
    const timestamp = new Date().toISOString();
    await AsyncStorage.setItem(LAST_AUTH_KEY, timestamp);
    await AsyncStorage.setItem(USER_PHONE_KEY, phone);
    
    console.log('✅ User created in database and session stored, timestamp:', timestamp);
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw error;
  }
};

// Verify PIN - now checks against database
export const verifyPin = async (phone, pin) => {
  try {
    console.log('🔍 Verifying PIN against database for phone:', phone);
    
    // Verify credentials against Firebase database
    const result = await verifyUserCredentials(phone, pin);
    
    if (result.success) {
      console.log('✅ Authentication successful');
      // Store session info locally
      const timestamp = new Date().toISOString();
      await AsyncStorage.setItem(LAST_AUTH_KEY, timestamp);
      await AsyncStorage.setItem(USER_PHONE_KEY, phone);
      return true;
    } else {
      console.log('❌ Authentication failed:', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying PIN:', error);
    return false;
  }
};

// Check if auto-login allowed
export const canAutoLogin = async () => {
  try {
    console.log('🕒 Checking auto-login status...');
    const lastAuth = await AsyncStorage.getItem(LAST_AUTH_KEY);
    console.log('📅 Last auth timestamp:', lastAuth);
    
    if (!lastAuth) {
      console.log('❌ No previous authentication found');
      return false;
    }
    
    const hoursSinceLastAuth = (new Date() - new Date(lastAuth)) / (1000 * 60 * 60);
    console.log('⏱️ Hours since last auth:', hoursSinceLastAuth.toFixed(2));
    
    const isValid = hoursSinceLastAuth < 72;
    console.log('✅ Auto-login valid:', isValid);
    return isValid;
  } catch (error) {
    console.error('❌ Error checking auto-login:', error);
    return false;
  }
};

// Force logout - clean up local session only
export const logout = async () => {
  try {
    console.log('🚪 Logging out - cleaning local session');
    await AsyncStorage.removeItem(LAST_AUTH_KEY);
    await AsyncStorage.removeItem(USER_PHONE_KEY);
    
    // Clean up any old keychain/storage data (for migration compatibility)
    const keychainAvailable = await isKeychainAvailable();
    if (keychainAvailable) {
      await Keychain.resetGenericPassword({ service: AUTH_SERVICE });
    } else {
      await AsyncStorage.removeItem(`${AUTH_SERVICE}_credentials`);
    }
    console.log('✅ Logout completed');
  } catch (error) {
    console.error('❌ Error during logout:', error);
  }
};

// Get current user's phone - from local session
export const getCurrentUserPhone = async () => {
  try {
    // Get from local session storage
    return await AsyncStorage.getItem(USER_PHONE_KEY);
  } catch (error) {
    console.error('Error getting current user phone:', error);
    return null;
  }
};

// Additional function to update PIN (updates database)
export const changeUserPin = async (phone, newPin) => {
  try {
    console.log('🔄 Updating PIN in database for phone:', phone);
    await updateUserPin(phone, newPin);
    console.log('✅ PIN updated successfully in database');
    return true;
  } catch (error) {
    console.error('❌ Error updating PIN:', error);
    throw error;
  }
};