import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, FlatList, Switch, TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions, Modal } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { app } from './firebaseConfig';
import { Picker } from '@react-native-picker/picker';
import ExportScreen from './ExportScreen';
import DashboardScreen from './DashboardScreen';
import BookingScreen from './BookingScreen';
import BookingsListScreen from './BookingsListScreen';
import InventoryScreen from './InventoryScreen';

const Stack = createStackNavigator();
const db = getFirestore(app);

// Add Customer Screen Component
function AddCustomerScreen({ navigation }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bookId, setBookId] = useState('');
  const [gender, setGender] = useState('Male');
  const [category, setCategory] = useState('Domestic');
  const [subsidy, setSubsidy] = useState(false);
  const [address, setAddress] = useState('');
  const [cylinders, setCylinders] = useState(1);
  const [cylinderType, setCylinderType] = useState('14.2kg');
  const [customers, setCustomers] = useState([]);

  const windowHeight = Dimensions.get('window').height;

  useEffect(() => {
    const q = query(collection(db, "customers"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setCustomers(list);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async () => {
    // Check if phone number already exists
    const phoneExists = customers.some(customer => customer.phone === phone);
    if (phoneExists) {
      alert("A customer with this phone number already exists!");
      return;
    }

    // Check if book ID already exists
    const bookIdExists = customers.some(customer => customer.bookId === bookId);
    if (bookIdExists) {
      alert("A customer with this book ID already exists!");
      return;
    }

    if (!name.trim() || !phone.trim() || !bookId.trim()) {
      alert("Please fill in name, phone number, and book ID!");
      return;
    }

    // Validate book ID format (16 alphanumeric characters)
    if (!/^[A-Za-z0-9]{16}$/.test(bookId)) {
      alert("Book ID must be exactly 16 alphanumeric characters!");
      return;
    }

    try {
      await addDoc(collection(db, "customers"), {
        name: name,
        phone: phone,
        bookId: bookId,
        gender: gender,
        category: category,
        subsidy: subsidy,
        address: address,
        cylinders: cylinders,
        cylinderType: cylinderType,
        payment: {
          status: '',
          amount: 0,
          lastPaymentDate: null,
        },
        createdAt: new Date(),
      });
      alert("Customer saved successfully!");
      setName('');
      setPhone('');
      setBookId('');
      setAddress('');
      setCylinders(1);
      setCylinderType('14.2kg');
      setGender('Male');
      setCategory('Domestic');
      setSubsidy(false);
    } catch (error) {
      alert("Error saving customer: " + error.message);
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
        keyboardDismissMode="on-drag"        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.buttonContainer}>
          <Button 
            title="View Customers List" 
            onPress={() => navigation.navigate('CustomersList')}
            color="#007AFF"
          />
        </View>

        <TextInput placeholder="Full Name" value={name} onChangeText={setName} style={styles.input} />
        
        <TextInput 
          placeholder="Book ID (16 alphanumeric characters)" 
          value={bookId} 
          onChangeText={(text) => {
            // Only allow alphanumeric characters and limit to 16 characters
            const alphanumericOnly = text.replace(/[^A-Za-z0-9]/g, '');
            if (alphanumericOnly.length <= 16) {
              setBookId(alphanumericOnly.toUpperCase());
            }
          }}
          style={styles.input} 
          keyboardType="default"
          maxLength={16}
          autoCapitalize="characters"
        />
        
        <Text style={styles.label}>Gender:</Text>
        <Picker selectedValue={gender} onValueChange={setGender} style={styles.input}>
          <Picker.Item label="Male" value="Male" />
          <Picker.Item label="Female" value="Female" />
          <Picker.Item label="Other" value="Other" />
        </Picker>

        <Text style={styles.label}>Category:</Text>
        <Picker selectedValue={category} onValueChange={setCategory} style={styles.input}>
          <Picker.Item label="Domestic" value="Domestic" />
          <Picker.Item label="Commercial" value="Commercial" />
        </Picker>

        <View style={styles.switchContainer}>
          <Text style={styles.label}>Subsidy Applicable?</Text>
          <Switch value={subsidy} onValueChange={setSubsidy} />
        </View>

        <TextInput placeholder="Phone" value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" />
        
        <TextInput placeholder="Address" value={address} onChangeText={setAddress} style={styles.input} multiline />
        
        <Text style={styles.label}>Number of Cylinders:</Text>
        <View style={styles.counterContainer}>
          <TouchableOpacity 
            style={styles.counterButton} 
            onPress={() => setCylinders(Math.max(0, cylinders - 1))}
          >
            <Text style={styles.counterButtonText}>-</Text>
          </TouchableOpacity>
          
          <View style={styles.counterDisplay}>
            <Text style={styles.counterText}>{cylinders}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.counterButton}            onPress={() => setCylinders(cylinders + 1)}
          >
            <Text style={styles.counterButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Cylinder Type:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={cylinderType}
            onValueChange={setCylinderType}
            style={styles.picker}
          >
            <Picker.Item label="14.2kg" value="14.2kg" />
            <Picker.Item label="5kg" value="5kg" />
            <Picker.Item label="19kg" value="19kg" />
          </Picker>
        </View>

        <Button title="Save Customer" onPress={handleSubmit} />
      </ScrollView>
    </View>
  );
}

// Edit Customer Screen Component
function EditCustomerScreen({ route, navigation }) {
  const { customer } = route.params;
  
  const [name, setName] = useState(customer.name || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [gender, setGender] = useState(customer.gender || 'Male');
  const [category, setCategory] = useState(customer.category || 'Domestic');
  const [subsidy, setSubsidy] = useState(customer.subsidy || false);
  const [address, setAddress] = useState(customer.address || '');
  const [cylinders, setCylinders] = useState(customer.cylinders || 1);
  const [cylinderType, setCylinderType] = useState(customer.cylinderType || '14.2kg');

  const handleUpdate = async () => {
    if (!name.trim() || !phone.trim()) {
      alert("Please fill in both name and phone number!");
      return;
    }

    try {
      const customerRef = doc(db, "customers", customer.id);
      await updateDoc(customerRef, {
        name: name,
        phone: phone,
        gender: gender,
        category: category,
        subsidy: subsidy,
        address: address,
        cylinders: cylinders,
        cylinderType: cylinderType,
        updatedAt: new Date(),
      });
      alert("Customer updated successfully!");
      navigation.goBack();
    } catch (error) {
      alert("Error updating customer: " + error.message);
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
        <View style={styles.buttonContainer}>
          <Button 
            title="Back to List" 
            onPress={() => navigation.goBack()}
            color="#6c757d"
          />
        </View>

        <TextInput placeholder="Full Name" value={name} onChangeText={setName} style={styles.input} />
        
        <Text style={styles.label}>Gender:</Text>
        <Picker selectedValue={gender} onValueChange={setGender} style={styles.input}>
          <Picker.Item label="Male" value="Male" />
          <Picker.Item label="Female" value="Female" />
          <Picker.Item label="Other" value="Other" />
        </Picker>

        <Text style={styles.label}>Category:</Text>
        <Picker selectedValue={category} onValueChange={setCategory} style={styles.input}>
          <Picker.Item label="Domestic" value="Domestic" />
          <Picker.Item label="Commercial" value="Commercial" />
        </Picker>

        <View style={styles.switchContainer}>
          <Text style={styles.label}>Subsidy Applicable?</Text>
          <Switch value={subsidy} onValueChange={setSubsidy} />
        </View>

        <TextInput placeholder="Phone" value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" />
        
        <TextInput placeholder="Address" value={address} onChangeText={setAddress} style={styles.input} multiline />
        
        <Text style={styles.label}>Number of Cylinders:</Text>
        <View style={styles.counterContainer}>
          <TouchableOpacity 
            style={styles.counterButton} 
            onPress={() => setCylinders(Math.max(0, cylinders - 1))}
          >
            <Text style={styles.counterButtonText}>-</Text>
          </TouchableOpacity>
          
          <View style={styles.counterDisplay}>
            <Text style={styles.counterText}>{cylinders}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.counterButton} 
            onPress={() => setCylinders(cylinders + 1)}
          >
            <Text style={styles.counterButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.label}>Cylinder Type:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={cylinderType}
            onValueChange={setCylinderType}
            style={styles.picker}
          >
            <Picker.Item label="14.2kg" value="14.2kg" />
            <Picker.Item label="5kg" value="5kg" />
            <Picker.Item label="19kg" value="19kg" />
          </Picker>
        </View>
        
        <Button title="Update Customer" onPress={handleUpdate} color="#28a745" />
      </ScrollView>
    </View>
  );
}

// Customers List Screen Component
function CustomersListScreen({ navigation, route }) {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const { filter } = route.params || {};

  // Pricing constants (should match BookingScreen)
  const PRICE_PER_CYLINDER = 1150;
  const SERVICE_FEES = {
    'Pickup': 50,
    'Drop': 50,
    'Both': 70
  };

  useEffect(() => {
    const q = query(collection(db, "customers"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setCustomers(list);
    });
    return unsubscribe;
  }, []);

  // Function to fix "FULL" amounts in payment history
  const fixFullAmountsInCustomerHistory = async (customer) => {
    if (!customer.paymentHistory) return customer;
    
    try {
      // Check if there are any "FULL" amounts that need fixing
      const hasFullAmounts = customer.paymentHistory.some(transaction => transaction.amount === 'FULL');
      
      if (hasFullAmounts) {
        const updatedHistory = customer.paymentHistory.map(transaction => {
          if (transaction.amount === 'FULL' && transaction.paymentStatus === 'Paid') {
            // For fixed calculations, we'll use a default of 1 cylinder + pickup service
            // In reality, this would need booking details, but we can provide a reasonable default
            const cylinderCost = 1 * PRICE_PER_CYLINDER; // Default to 1 cylinder
            const serviceFee = SERVICE_FEES['Pickup']; // Default to pickup service
            return {
              ...transaction,
              amount: (cylinderCost + serviceFee).toString()
            };
          }
          return transaction;
        });
        
        // Update the customer record in the database
        const customerRef = doc(db, "customers", customer.id);
        await updateDoc(customerRef, {
          paymentHistory: updatedHistory
        });
        
        // Return updated customer for immediate display
        return {
          ...customer,
          paymentHistory: updatedHistory
        };
      }
    } catch (error) {
      console.error("Error fixing FULL amounts:", error);
    }
    
    return customer;
  };

  // Apply search filter first, then category filter
  const getFilteredCustomers = () => {
    let filtered = customers.filter(c =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm)
    );

    // Apply dashboard filters
    if (filter === 'domestic') {
      filtered = filtered.filter(customer => customer.category === 'Domestic');
    } else if (filter === 'commercial') {
      filtered = filtered.filter(customer => customer.category === 'Commercial');
    } else if (filter === 'subsidy') {
      filtered = filtered.filter(customer => customer.subsidy === true);
    } else if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(customer => {
        const createdAt = customer.createdAt?.toDate ? customer.createdAt.toDate() : new Date(customer.createdAt);
        return createdAt >= today;
      });
    }

    return filtered;
  };

  const getFilterTitle = () => {
    switch (filter) {
      case 'domestic': return '🏠 Showing Domestic Customers Only';
      case 'commercial': return '🏢 Showing Commercial Customers Only';
      case 'subsidy': return '💰 Showing Subsidy Customers Only';
      case 'today': return '📅 Showing Today\'s Registrations Only';
      default: return '';
    }
  };

  const getFilterBannerStyle = () => {
    switch (filter) {
      case 'domestic': return { backgroundColor: '#e3f2fd', borderColor: '#2196f3' };
      case 'commercial': return { backgroundColor: '#fce4ec', borderColor: '#e91e63' };
      case 'subsidy': return { backgroundColor: '#f1f8e9', borderColor: '#8bc34a' };
      case 'today': return { backgroundColor: '#f3e5f5', borderColor: '#9c27b0' };
      default: return { backgroundColor: '#fff3cd', borderColor: '#ffeaa7' };
    }
  };

  const filteredCustomers = getFilteredCustomers();

  return (
    <View style={styles.container}>
      {filter && (
        <View style={[styles.filterBanner, getFilterBannerStyle()]}>
          <View style={styles.filterTextContainer}>
            <Text style={styles.filterText}>{getFilterTitle()}</Text>
            <Text style={styles.filterCount}>({filteredCustomers.length} found)</Text>
          </View>
          <TouchableOpacity 
            style={styles.clearFilterButton}
            onPress={() => navigation.setParams({ filter: null })}
          >
            <Text style={styles.clearFilterText}>Show All</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button 
          title="Add New Customer" 
          onPress={() => navigation.navigate('AddCustomer')}
          color="#28a745"
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Export Customer Data" 
          onPress={() => navigation.navigate('Export')}
          color="#17a2b8"
        />
      </View>

      <TextInput
        placeholder="Search by name or phone..."
        value={searchTerm}
        onChangeText={setSearchTerm}
        style={styles.input}
      />

      <Text style={styles.title}>
        Customers ({filteredCustomers.length})
        {filter && ` - ${getFilterTitle().replace(/📋|✅|⚡|🏠|🏢|💰|📅/g, '').replace('Showing', '').replace('Only', '').trim()}`}
      </Text>

      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.customerItem}
            onPress={async () => {
              // Fix any "FULL" amounts before showing the modal
              const updatedCustomer = await fixFullAmountsInCustomerHistory(item);
              setSelectedCustomer(updatedCustomer);
              setModalVisible(true);
            }}
          >
            <Text style={styles.customerName}>{item.name}</Text>
            <Text style={styles.customerDetails}>Phone: {item.phone}</Text>
            {item.bookId && <Text style={styles.customerDetails}>Book ID: {item.bookId}</Text>}
            <Text style={styles.customerDetails}>Gender: {item.gender}</Text>
            <Text style={styles.customerDetails}>Category: {item.category || 'Not Set'}</Text>
            <Text style={styles.customerDetails}>Address: {item.address}</Text>
            <Text style={styles.customerDetails}>Cylinders: {item.cylinders}</Text>
            <Text style={styles.customerDetails}>
              Subsidy: {item.subsidy ? 'Yes' : 'No'}
            </Text>
            <Text style={styles.paymentDate}>
              Last Payment: {item.payment?.lastPaymentDate ? 
                new Date(item.payment.lastPaymentDate.seconds ? 
                  item.payment.lastPaymentDate.toDate() : 
                  item.payment.lastPaymentDate
                ).toLocaleDateString() : 
                'No payment recorded'}
            </Text>
            <Text style={styles.paymentHistory}>
              Payment History: {item.paymentHistory ? 
                `${item.paymentHistory.length} transaction${item.paymentHistory.length !== 1 ? 's' : ''}` : 
                'No transactions'}
            </Text>
          </TouchableOpacity>
        )}
      />
      
      {/* Customer Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Customer Details</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => {
                    setModalVisible(false);
                    navigation.navigate('EditCustomer', { customer: selectedCustomer });
                  }}
                >
                  <Text style={styles.editButtonText}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => {
                    setModalVisible(false);
                    setShowPaymentHistory(false);
                  }}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {selectedCustomer && (
              <ScrollView style={styles.modalContent}>
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>📋 Basic Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>{selectedCustomer.name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone:</Text>
                    <Text style={styles.detailValue}>{selectedCustomer.phone}</Text>
                  </View>
                  {selectedCustomer.bookId && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Book ID:</Text>
                      <Text style={[styles.detailValue, styles.bookIdText]}>{selectedCustomer.bookId}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Gender:</Text>
                    <Text style={styles.detailValue}>{selectedCustomer.gender}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Category:</Text>
                    <Text style={styles.detailValue}>{selectedCustomer.category || 'Not Set'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Cylinders:</Text>
                    <Text style={styles.detailValue}>{selectedCustomer.cylinders || 0}</Text>
                  </View>
                  {selectedCustomer.address && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Address:</Text>
                      <Text style={styles.detailValue}>{selectedCustomer.address}</Text>
                    </View>
                  )}
                  {selectedCustomer.subsidy && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Subsidy:</Text>
                      <Text style={[styles.detailValue, styles.subsidyValue]}>💰 Applicable</Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>💳 Payment Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Last Payment:</Text>
                    <Text style={styles.detailValue}>
                      {selectedCustomer.payment?.lastPaymentDate ? 
                        new Date(selectedCustomer.payment.lastPaymentDate.seconds ? 
                          selectedCustomer.payment.lastPaymentDate.toDate() : 
                          selectedCustomer.payment.lastPaymentDate
                        ).toLocaleDateString() : 
                        'No payment recorded'}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.detailRow}
                    onPress={() => setShowPaymentHistory(!showPaymentHistory)}
                  >
                    <Text style={styles.detailLabel}>Payment History:</Text>
                    <Text style={[styles.detailValue, styles.clickableText]}>
                      {selectedCustomer.paymentHistory ? 
                        `${selectedCustomer.paymentHistory.length} transaction${selectedCustomer.paymentHistory.length !== 1 ? 's' : ''} ${showPaymentHistory ? '▼' : '▶'}` : 
                        'No transactions'}
                    </Text>
                  </TouchableOpacity>
                  
                  {showPaymentHistory && selectedCustomer.paymentHistory && selectedCustomer.paymentHistory.length > 0 && (
                    <View style={styles.paymentHistoryExpanded}>
                      <Text style={styles.historyTitle}>📋 Transaction History:</Text>
                      {selectedCustomer.paymentHistory
                        .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by date, newest first
                        .map((transaction, index) => {
                          // Determine display status based on payment and delivery status
                          let displayStatus = transaction.status;
                          if (!displayStatus) {
                            // For older records that might not have the new status field
                            if (transaction.paymentStatus === 'Paid' && transaction.deliveryStatus === 'Delivered') {
                              displayStatus = 'Completed';
                            } else if (transaction.paymentStatus === 'Paid') {
                              displayStatus = 'Paid - Pending Delivery';
                            } else if (transaction.paymentStatus === 'Partial') {
                              displayStatus = 'Partial Payment';
                            } else {
                              displayStatus = 'Pending';
                            }
                          }
                          
                          return (
                            <View key={index} style={styles.transactionItem}>
                              <View style={styles.transactionRow}>
                                <Text style={styles.transactionDate}>
                                  {new Date(transaction.date.seconds ? 
                                    transaction.date.toDate() : 
                                    transaction.date
                                  ).toLocaleDateString()}
                                </Text>
                                <Text style={styles.transactionAmount}>
                                  ₹{transaction.amount === 'FULL' ? (1 * PRICE_PER_CYLINDER + SERVICE_FEES['Pickup']) : (transaction.amount || 'N/A')}
                                </Text>
                              </View>
                              <Text style={[
                                styles.transactionStatus,
                                displayStatus === 'Completed' && styles.completedStatus,
                                displayStatus === 'Partial Payment' && styles.partialStatus
                              ]}>
                                Status: {displayStatus}
                              </Text>
                              {transaction.paymentStatus && transaction.deliveryStatus && (
                                <Text style={styles.transactionDetails}>
                                  Payment: {transaction.paymentStatus} • Delivery: {transaction.deliveryStatus}
                                </Text>
                              )}
                              {transaction.bookingId && (
                                <Text style={styles.transactionBooking}>
                                  Booking: {transaction.bookingId.substring(0, 8)}...
                                </Text>
                              )}
                            </View>
                          );
                        })
                      }
                    </View>
                  )}
                </View>

                {selectedCustomer.createdAt && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>📅 Registration Info</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Registered:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedCustomer.createdAt.seconds ? 
                          selectedCustomer.createdAt.toDate() : 
                          selectedCustomer.createdAt
                        ).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.bookLargeButton}
                    onPress={() => {
                      setModalVisible(false);
                      navigation.navigate('BookingScreen', { customerId: selectedCustomer.id });
                    }}
                  >
                    <Text style={styles.bookLargeButtonText}>📋 Book Cylinder</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Dashboard">
        <Stack.Screen 
          name="Dashboard" 
          component={DashboardScreen} 
          options={({ navigation }) => ({
            title: 'LPG Map',
            headerRight: () => (
              <TouchableOpacity 
                onPress={() => navigation.navigate('Inventory')}
                style={{
                  marginRight: 15,
                  backgroundColor: '#007AFF',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                }}
              >
                <Text style={{
                  color: 'white',
                  fontSize: 14,
                  fontWeight: '600',
                }}>
                  📦 Inventory
                </Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen 
          name="AddCustomer" 
          component={AddCustomerScreen} 
          options={{ title: 'Add New Customer' }}
        />
        <Stack.Screen 
          name="CustomersList" 
          component={CustomersListScreen} 
          options={{ title: 'Customers List' }}
        />
        <Stack.Screen 
          name="EditCustomer" 
          component={EditCustomerScreen} 
          options={{ title: 'Edit Customer' }}
        />
        <Stack.Screen 
          name="Export" 
          component={ExportScreen}
          options={{ title: 'Export Data' }}
        />
        <Stack.Screen 
          name="BookingScreen" 
          component={BookingScreen}
          options={{ title: 'Book Cylinder' }}
        />
        <Stack.Screen 
          name="BookingsList" 
          component={BookingsListScreen}
          options={{ title: 'Bookings List' }}
        />
        <Stack.Screen 
          name="Inventory" 
          component={InventoryScreen}
          options={{ title: 'Inventory Management' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
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
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 20,
    textAlign: 'center',
    color: '#333'
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    padding: 12, 
    marginBottom: 15, 
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 10,
    color: '#333'
  },
  switchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc'
  },
  buttonContainer: {
    marginBottom: 20,
  },
  customerItem: {
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#fff',
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
    marginBottom: 8,
  },
  customerDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 5,
  },
  counterButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  counterButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  counterDisplay: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  counterText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  picker: {
    height: 50,
  },
  filterBanner: {
    backgroundColor: '#fff3cd',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterTextContainer: {
    flex: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  filterCount: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  clearFilterButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  clearFilterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  paymentDate: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  paymentHistory: {
    fontSize: 11,
    color: '#007AFF',
    marginTop: 1,
    fontWeight: '500',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 10,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#999',
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f5f5f5',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  clickableText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  subsidyValue: {
    color: '#34C759',
    fontWeight: 'bold',
  },
  bookIdText: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#007AFF',
  },
  paymentHistoryExpanded: {
    marginTop: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  transactionItem: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  transactionAmount: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  transactionStatus: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  completedStatus: {
    color: '#34C759',
    fontWeight: 'bold',
  },
  partialStatus: {
    color: '#FF9500',
    fontWeight: 'bold',
  },
  transactionBooking: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  transactionDetails: {
    fontSize: 10,
    color: '#666',
    marginTop: 1,
    fontStyle: 'italic',
  },
  actionButtons: {
    marginTop: 10,
    marginBottom: 10,
  },
  bookLargeButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  bookLargeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
