import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Switch, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

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
});

export default function EditCustomerScreen({ route, navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const styles = createStyles(colors);
  const { customer } = route.params; // Changed from customerId to customer
  const [name, setName] = useState(customer.name || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [gender, setGender] = useState(customer.gender || 'Male');
  const [category, setCategory] = useState(customer.category || 'Domestic');
  const [address, setAddress] = useState(customer.address || '');
  const [cylinders, setCylinders] = useState(customer.cylinders || 1);
  const [cylinderType, setCylinderType] = useState(customer.cylinderType || '14.2kg');
  const [subsidy, setSubsidy] = useState(customer.subsidy || false);

  const handleUpdate = async () => {
    if (!name.trim() || !phone.trim()) {
      alert("Please fill in both name and phone number!");
      return;
    }

    try {
      await updateDoc(doc(db, "customers", customer.id), {
        name: name,
        phone: phone,
        gender: gender,
        category: category,
        address: address,
        cylinders: cylinders,
        cylinderType: cylinderType,
        subsidy: subsidy,
        updatedAt: new Date(),
      });
      alert("Customer updated!");
      navigation.goBack();
    } catch (error) {
      alert("Error updating: " + error.message);
    }
  };

  return (
    <View style={styles.safeContainer}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardDismissMode="on-drag"
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={styles.title}>Edit Customer</Text>
        
        <TextInput
          placeholder="Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        
        {customer.bookId && (
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyLabel}>Book ID - Alphanumeric (cannot be changed):</Text>
            <Text style={styles.readOnlyValue}>{customer.bookId}</Text>
          </View>
        )}
        
        <TextInput
          placeholder="Phone"
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
          keyboardType="phone-pad"
        />
        
        <Text style={styles.label}>Gender:</Text>
        <Picker
          selectedValue={gender}
          onValueChange={setGender}
          style={styles.input}
        >
          <Picker.Item label="Male" value="Male" />
          <Picker.Item label="Female" value="Female" />
          <Picker.Item label="Other" value="Other" />
        </Picker>

        <Text style={styles.label}>Category:</Text>
        <Picker
          selectedValue={category}
          onValueChange={setCategory}
          style={styles.input}
        >
          <Picker.Item label="Domestic" value="Domestic" />
          <Picker.Item label="Commercial" value="Commercial" />
        </Picker>
        
        <TextInput
          placeholder="Address"
          value={address}
          onChangeText={setAddress}
          style={styles.input}
          multiline
        />
        
        <Text style={styles.label}>Cylinder Type:</Text>
        <Picker
          selectedValue={cylinderType}
          onValueChange={setCylinderType}
          style={styles.input}
        >
          <Picker.Item label="14.2kg" value="14.2kg" />
          <Picker.Item label="5kg" value="5kg" />
          <Picker.Item label="19kg" value="19kg" />
        </Picker>
        
        <Text style={styles.label}>Number of Cylinders: {cylinders}</Text>
        <View style={styles.counterContainer}>
          <Button title="-" onPress={() => setCylinders(Math.max(0, cylinders - 1))} />
          <Text style={styles.cylinderText}>{cylinders}</Text>
          <Button title="+" onPress={() => setCylinders(cylinders + 1)} />
        </View>
        
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Subsidy Applicable?</Text>
          <Switch value={subsidy} onValueChange={setSubsidy} />
        </View>

        <Button title="Update Customer" onPress={handleUpdate} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  container: { 
    flex: 1, 
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 100,
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 20,
    color: colors.text,
  },
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 5, 
    marginTop: 10,
    color: colors.text,
  },
  input: { 
    borderWidth: 1, 
    borderColor: colors.inputBorder, 
    padding: 12, 
    marginBottom: 15, 
    borderRadius: 8,
    backgroundColor: colors.inputBackground,
    fontSize: 16,
    color: colors.text,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  cylinderText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    color: colors.text,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    padding: 10,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readOnlyField: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  readOnlyLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  readOnlyValue: {
    fontSize: 16,
    color: colors.text,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
});