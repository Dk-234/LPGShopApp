import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Picker } from 'react-native';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export default function ManageStovesScreen() {
  const [action, setAction] = useState("ADD"); // ADD or LEND
  const [model, setModel] = useState("Single Burner");
  const [customerId, setCustomerId] = useState("");

  const handleAction = async () => {
    if (action === "ADD") {
      await addDoc(collection(db, "stoves"), {
        model,
        status: "AVAILABLE",
      });
      alert("Stove added to inventory!");
    } else {
      // Mark stove as lent (requires fetching an available stove first)
      alert("Lent stove to customer " + customerId);
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
        <Picker.Item label="Lend to Customer" value="LEND" />
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

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
});