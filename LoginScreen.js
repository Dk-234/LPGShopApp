import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert, useColorScheme } from 'react-native';
import { verifyPin, setUserPin } from './auth';
import { useNavigation } from '@react-navigation/native';
import { useAuthContext } from './AuthContext';

// Color scheme utility
const getColors = (isDark) => ({
  background: isDark ? '#121212' : '#ffffff',
  surface: isDark ? '#1e1e1e' : '#f5f5f5',
  card: isDark ? '#2d2d2d' : '#ffffff',
  text: isDark ? '#ffffff' : '#000000',
  textSecondary: isDark ? '#b3b3b3' : '#666666',
  border: isDark ? '#444444' : '#e0e0e0',
  primary: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  inputBackground: isDark ? '#2d2d2d' : '#ffffff',
  inputBorder: isDark ? '#444444' : '#ccc',
  placeholderText: isDark ? '#888888' : '#999999',
});

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const styles = createStyles(colors);
  
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const navigation = useNavigation();
  const { refreshAuth } = useAuthContext();

  const handleLogin = async () => {
    try {
      console.log('🔐 Login attempt for phone:', phone, 'isNewUser:', isNewUser);
      
      if (isNewUser) {
        // Create new user
        console.log('👤 Creating new user...');
        await setUserPin(phone, pin);
        Alert.alert('Success', 'Account created successfully!');
        // Refresh authentication status to trigger navigation
        await refreshAuth();
      } else {
        // Verify existing user
        console.log('🔍 Verifying existing user...');
        const isValid = await verifyPin(phone, pin);
        console.log('✅ PIN verification result:', isValid);
        
        if (isValid) {
          // Don't call setUserPin for existing users - verifyPin already handles session
          // Refresh authentication status to trigger navigation
          await refreshAuth();
        } else {
          Alert.alert(
            'Invalid PIN', 
            'Please check your phone and PIN, or switch to "New User" if this is your first time.',
            [
              { text: 'OK', style: 'cancel' },
              { 
                text: 'New User?', 
                onPress: () => setIsNewUser(true)
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      if (error.message && error.message.includes('already exists')) {
        Alert.alert(
          'User Already Exists', 
          'This phone number is already registered. Please use "Existing User" login.',
          [
            { text: 'OK', onPress: () => setIsNewUser(false) }
          ]
        );
      } else {
        Alert.alert('Error', 'Login failed. Please try again.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LPG Shop Manager</Text>
      
      <TextInput
        placeholder="Phone Number"
        placeholderTextColor={colors.placeholderText}
        value={phone}
        onChangeText={setPhone}
        style={styles.input}
        keyboardType="phone-pad"
      />

      {isNewUser ? (
        <Text style={styles.note}>
          You're new! Create a 6-character alphanumeric PIN
          (e.g., A7B9C2)
        </Text>
      ) : null}

      <TextInput
        placeholder={isNewUser ? "Create PIN" : "Enter PIN"}
        placeholderTextColor={colors.placeholderText}
        value={pin}
        onChangeText={setPin}
        style={styles.input}
        maxLength={6}
        autoCapitalize="characters"
        secureTextEntry
      />

      <Button 
        title={isNewUser ? "Create Account" : "Login"} 
        onPress={handleLogin} 
        disabled={!phone || pin.length !== 6}
        color={colors.primary}
      />
      
      <Button
        title={isNewUser ? "Existing User? Login" : "New User? Create Account"}
        onPress={() => setIsNewUser(!isNewUser)}
        color={colors.textSecondary}
      />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 30, 
    textAlign: 'center',
    color: colors.text,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: colors.text,
  },
  note: {
    color: colors.textSecondary,
    marginBottom: 10,
    textAlign: 'center'
  }
});