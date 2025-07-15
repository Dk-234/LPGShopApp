import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, TextInput, useColorScheme } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { addMultipleCylinders } from './dataService';

// Color scheme utility
const getColors = (isDark) => ({
  background: isDark ? '#121212' : '#ffffff',
  surface: isDark ? '#1e1e1e' : '#f5f5f5',
  card: isDark ? '#2d2d2d' : '#ffffff',
  text: isDark ? '#ffffff' : '#000000',
  textSecondary: isDark ? '#b3b3b3' : '#666666',
  border: isDark ? '#444444' : '#e0e0e0',
  primary: '#007AFF',
  inputBackground: isDark ? '#2d2d2d' : '#ffffff',
  inputBorder: isDark ? '#444444' : '#ccc',
});

export default function UpdateCylindersScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const styles = createStyles(colors);
  const [type, setType] = useState("14.2kg");
  const [status, setStatus] = useState("FULL");
  const [quantity, setQuantity] = useState(1);

  const handleAdd = async () => {
    try {
      await addMultipleCylinders({
        type,
        status
      }, quantity);
      alert(`${quantity} ${type} cylinders (${status}) added!`);
    } catch (error) {
      console.error("Error adding cylinders:", error);
      alert("Error adding cylinders. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Update Cylinder Stock</Text>
      
      <Picker
        selectedValue={type}
        onValueChange={setType}
        style={styles.input}
      >
        <Picker.Item label="14.2kg" value="14.2kg" />
        <Picker.Item label="5kg" value="5kg" />
        <Picker.Item label="19kg" value="19kg" />
      </Picker>

      <Picker
        selectedValue={status}
        onValueChange={setStatus}
        style={styles.input}
      >
        <Picker.Item label="FULL" value="FULL" />
        <Picker.Item label="EMPTY" value="EMPTY" />
      </Picker>

      <TextInput
        placeholder="Quantity"
        value={String(quantity)}
        onChangeText={(text) => setQuantity(Number(text) || 0)}
        keyboardType="numeric"
        style={styles.input}
      />

      <Button title="Add to Inventory" onPress={handleAdd} />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { 
    padding: 20,
    backgroundColor: colors.background,
    flex: 1,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    backgroundColor: colors.inputBackground,
    color: colors.text,
  },
});