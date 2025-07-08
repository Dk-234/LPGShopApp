import React, { useState, useEffect } from 'react';
import { View, Button, Text, StyleSheet, Alert, Share, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { app } from './firebaseConfig';

export default function ExportScreen() {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const db = getFirestore(app);

  useEffect(() => {
    const fetchCustomers = async () => {
      const querySnapshot = await getDocs(collection(db, "customers"));
      const list = [];
      querySnapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setCustomers(list);
    };
    fetchCustomers();
  }, []);

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm) ||
    customer.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    try {
      // Generate CSV content manually
      const headers = ['Name', 'Phone', 'Address', 'Cylinders', 'Payment Status', 'Subsidy'];
      
      const csvContent = [
        headers.join(','),
        ...filteredCustomers.map(customer => [
          `"${customer.name || ''}"`,
          `"${customer.phone || ''}"`,
          `"${customer.address || ''}"`,
          customer.cylinders || 0,
          `"${customer.payment?.status || 'Unknown'}"`,
          customer.subsidy ? 'Yes' : 'No'
        ].join(','))
      ].join('\n');

      // Share the CSV content
      Share.share({
        message: csvContent,
        title: 'Customer Data Export',
        subject: 'Customer Data CSV'
      })
      .then((result) => {
        if (result.action === Share.sharedAction) {
          Alert.alert('Success', 'Customer data exported successfully!');
        }
      })
      .catch((error) => {
        Alert.alert('Error', 'Failed to export data: ' + error.message);
      });
      
    } catch (error) {
      Alert.alert('Error', 'Failed to generate CSV: ' + error.message);
    }
  };

  const copyToClipboard = () => {
    try {
      const headers = ['Name', 'Phone', 'Address', 'Cylinders', 'Payment Status', 'Subsidy'];
      
      const csvContent = [
        headers.join('\t'),
        ...filteredCustomers.map(customer => [
          customer.name || '',
          customer.phone || '',
          customer.address || '',
          customer.cylinders || 0,
          customer.payment?.status || 'Unknown',
          customer.subsidy ? 'Yes' : 'No'
        ].join('\t'))
      ].join('\n');

      // For React Native, we'll show the data in an alert for now
      Alert.alert(
        'Customer Data',
        'Data ready to copy:\n\n' + csvContent.substring(0, 200) + '...',
        [
          { text: 'Share', onPress: () => Share.share({ message: csvContent }) },
          { text: 'OK' }
        ]
      );
      
    } catch (error) {
      Alert.alert('Error', 'Failed to prepare data: ' + error.message);
    }
  };

  const shareIndividualCustomer = (customer) => {
    try {
      const customerData = `
Customer Details:
━━━━━━━━━━━━━━━━━━━━━

👤 Name: ${customer.name || 'N/A'}
📞 Phone: ${customer.phone || 'N/A'}
🏠 Address: ${customer.address || 'N/A'}
🛢️ Cylinders: ${customer.cylinders || 0}
💰 Payment: ${customer.payment?.status || 'Unknown'}${customer.payment?.status === 'Partial' ? ` (₹${customer.payment?.amount})` : ''}
🏷️ Subsidy: ${customer.subsidy ? 'Yes' : 'No'}
📅 Created: ${customer.createdAt ? new Date(customer.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}

━━━━━━━━━━━━━━━━━━━━━
Generated from LPG Shop App
      `.trim();

      Share.share({
        message: customerData,
        title: `Customer: ${customer.name}`,
        subject: `Customer Details - ${customer.name}`
      })
      .then((result) => {
        if (result.action === Share.sharedAction) {
          Alert.alert('Success', `${customer.name}'s details shared successfully!`);
        }
      })
      .catch((error) => {
        Alert.alert('Error', 'Failed to share customer data: ' + error.message);
      });
      
    } catch (error) {
      Alert.alert('Error', 'Failed to prepare customer data: ' + error.message);
    }
  };

  const renderCustomerItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.customerItem}
      onPress={() => shareIndividualCustomer(item)}
    >
      <Text style={styles.customerName}>{item.name}</Text>
      <Text style={styles.customerPhone}>📞 {item.phone}</Text>
      <Text style={styles.customerDetails}>
        🛢️ {item.cylinders} cylinders • 💰 {item.payment?.status || 'Unknown'}
      </Text>
      <Text style={styles.shareHint}>Tap to share this customer's details</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Export Customer Data</Text>
      <Text style={styles.subtitle}>{customers.length} total • {filteredCustomers.length} filtered</Text>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Share All as CSV" 
          onPress={exportToCSV} 
          color="#28a745"
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Copy All Data" 
          onPress={copyToClipboard} 
          color="#17a2b8"
        />
      </View>
      
      <Text style={styles.sectionTitle}>Individual Customer Data:</Text>
      
      <TextInput
        placeholder="Search by name, phone, or address..."
        value={searchTerm}
        onChangeText={setSearchTerm}
        style={styles.searchInput}
      />
      
      <Text style={styles.instructions}>
        {searchTerm ? `Showing ${filteredCustomers.length} results` : 'Tap any customer below to share their individual details'}
      </Text>
      
      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerItem}
        keyExtractor={(item) => item.id}
        style={styles.customerList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchTerm ? 'No customers found matching your search' : 'No customers available'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 10,
    textAlign: 'center',
    color: '#333'
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666'
  },
  buttonContainer: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333'
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic'
  },
  customerList: {
    flex: 1,
  },
  customerItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  customerPhone: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 5,
  },
  customerDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  shareHint: {
    fontSize: 12,
    color: '#28a745',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  }
});