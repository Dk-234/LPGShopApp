import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, TextInput } from 'react-native';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export default function UpdateCylindersScreen() {
  const [type, setType] = useState("14.2kg");
  const [status, setStatus] = useState("FULL");
  const [quantity, setQuantity] = useState(1);

  const handleAdd = async () => {
    for (let i = 0; i < quantity; i++) {
      await addDoc(collection(db, "cylinders"), {
        type,
        status,
        lastUpdated: new Date(),
      });
    }
    alert(`${quantity} ${type} cylinders (${status}) added!`);
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