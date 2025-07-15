import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, TextInput, useColorScheme, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { addStove } from './dataService';

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

export default function ManageStovesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const styles = createStyles(colors);
  const [action, setAction] = useState("ADD"); // ADD or LEND
  const [model, setModel] = useState("Single Burner");
  const [customerId, setCustomerId] = useState("");

  const handleAction = async () => {
    try {
      if (action === "ADD") {
        await addStove({
          model,
          status: "AVAILABLE",
        });
        Alert.alert("Success", "Stove added to inventory!");
      } else {
        // Mark stove as lent (requires fetching an available stove first)
        Alert.alert("Info", "Use the main Inventory screen to lend stoves to customers with proper customer selection.");
      }
    } catch (error) {
      console.error("Error in stove action:", error);
      Alert.alert("Error", "Failed to perform action: " + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Stoves</Text>
      
      <Picker
        selectedValue={action}
        onValueChange={setAction}
        style={styles.input}
      >
        <Picker.Item label="Add New Stove" value="ADD" />
        <Picker.Item label="Rent to Customer" value="LEND" />
      </Picker>

      <Picker
        selectedValue={model}
        onValueChange={setModel}
        style={styles.input}
      >
        <Picker.Item label="Single Burner" value="Single Burner" />
        <Picker.Item label="Standard 2-Burner" value="Standard 2-Burner" />
      </Picker>

      {action === "LEND" && (
        <TextInput
          placeholder="Customer ID"
          value={customerId}
          onChangeText={setCustomerId}
          style={styles.input}
        />
      )}

      <Button title={action === "ADD" ? "Add Stove" : "Lend Stove"} onPress={handleAction} />
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