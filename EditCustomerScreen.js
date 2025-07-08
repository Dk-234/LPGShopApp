import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export default function EditCustomerScreen({ route, navigation }) {
  const { customer } = route.params; // Changed from customerId to customer
  const [name, setName] = useState(customer.name || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [gender, setGender] = useState(customer.gender || 'Male');
  const [category, setCategory] = useState(customer.category || 'Domestic');
  const [address, setAddress] = useState(customer.address || '');
  const [cylinders, setCylinders] = useState(customer.cylinders || 1);
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

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: { 
    flex: 1, 
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 100,
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 5, marginTop: 10 },
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    padding: 12, 
    marginBottom: 15, 
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
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
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    padding: 10,
  },
  readOnlyField: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  readOnlyLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  readOnlyValue: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
});