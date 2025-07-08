import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { doc, getDoc, collection, addDoc, query, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

export default function BookingScreen({ route }) {
  const { customerId } = route.params || {};
  const [customer, setCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [cylinders, setCylinders] = useState(1);
  const [dscNumber, setDscNumber] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const [amount, setAmount] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date());
  const [serviceType, setServiceType] = useState('No');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Price per cylinder (you can adjust this value as needed)
  const PRICE_PER_CYLINDER = 1150;

  // Service fees
  const SERVICE_FEES = {
    'No': 0,
    'Pickup': 50,
    'Drop': 50,
    'Pickup + Drop': 70
  };

  // Fetch all customers for dropdown if no customerId provided
  useEffect(() => {
    if (!customerId) {
      const q = query(collection(db, "customers"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        setCustomers(list);
        setFilteredCustomers(list);
      });
      return unsubscribe;
    }
  }, [customerId]);

  // Filter customers based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers);
      setShowCustomerList(false);
    } else {
      const filtered = customers.filter(customer => 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery) ||
        (customer.address && customer.address.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredCustomers(filtered);
      setShowCustomerList(true);
    }
  }, [searchQuery, customers]);

  // Auto-calculate amount when payment status is "Paid"
  useEffect(() => {
    if (paymentStatus === 'Paid') {
      const cylinderCost = cylinders * PRICE_PER_CYLINDER;
      const serviceFee = SERVICE_FEES[serviceType] || 0;
      const totalAmount = cylinderCost + serviceFee;
      setAmount(totalAmount.toString());
    } else if (paymentStatus === 'Pending') {
      setAmount('');
    }
  }, [paymentStatus, cylinders, serviceType]);

  // Fetch customer details
  useEffect(() => {
    const fetchCustomer = async () => {
      const customerIdToFetch = customerId || selectedCustomerId;
      if (customerIdToFetch) {
        const docRef = doc(db, "customers", customerIdToFetch);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setCustomer(docSnap.data());
      }
    };
    fetchCustomer();
  }, [customerId, selectedCustomerId]);

  const handleCustomerSelection = (customer) => {
    setSelectedCustomerId(customer.id);
    setCustomer(customer);
    setSearchQuery(customer.name);
    setShowCustomerList(false);
  };

  const handleServiceTypeSelection = (selectedService) => {
    if (serviceType === selectedService) {
      // If clicking the same service, deselect it and set to "No"
      setServiceType('No');
    } else {
      // If clicking a different service, select it
      setServiceType(selectedService);
    }
  };

  const handleBooking = async () => {
    const customerIdToBook = customerId || selectedCustomerId;
    if (!customerIdToBook) {
      alert("Please select a customer!");
      return;
    }

    // Validate DSC number (4 digits)
    if (!dscNumber.trim()) {
      alert("Please enter DSC number!");
      return;
    }

    if (!/^\d{4}$/.test(dscNumber)) {
      alert("DSC number must be exactly 4 digits!");
      return;
    }
    
    try {
      await addDoc(collection(db, "bookings"), {
        customerId: customerIdToBook,
        cylinders,
        dscNumber: dscNumber,
        payment: { status: paymentStatus, amount },
        deliveryDate,
        serviceType,
        status: "Booked",
        createdAt: new Date(),
      });
      alert("Booking confirmed!");
      // Reset DSC number for next booking
      setDscNumber('');
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>
        {customerId ? `Book Cylinder for ${customer?.name || 'Loading...'}` : 'Book Cylinder'}
      </Text>

      {!customerId && (
        <View style={styles.customerSearchContainer}>
          <Text style={styles.label}>Search Customer:</Text>
          <TextInput
            placeholder="Search by name, phone, or address..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.input}
          />
          
          {showCustomerList && (
            <View style={styles.customerListContainer}>
              <ScrollView style={styles.customerList} nestedScrollEnabled>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((cust) => (
                    <TouchableOpacity
                      key={cust.id}
                      style={styles.customerItem}
                      onPress={() => handleCustomerSelection(cust)}
                    >
                      <Text style={styles.customerName}>{cust.name}</Text>
                      <Text style={styles.customerDetails}>{cust.phone}</Text>
                      {cust.address && (
                        <Text style={styles.customerAddress}>{cust.address}</Text>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noResults}>No customers found</Text>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      <Text style={styles.label}>Number of Cylinders:</Text>
      <TextInput
        placeholder="Number of Cylinders"
        value={String(cylinders)}
        onChangeText={(text) => setCylinders(Number(text))}
        keyboardType="numeric"
        style={styles.input}
      />

      <Text style={styles.label}>DSC Number (4 digits):</Text>
      <TextInput
        placeholder="Enter 4-digit DSC number"
        value={dscNumber}
        onChangeText={(text) => {
          // Only allow digits and limit to 4 characters
          const numbersOnly = text.replace(/[^0-9]/g, '');
          if (numbersOnly.length <= 4) {
            setDscNumber(numbersOnly);
          }
        }}
        keyboardType="number-pad"
        maxLength={4}
        style={styles.input}
      />

      <Text style={styles.label}>Payment Status:</Text>
      <Picker
        selectedValue={paymentStatus}
        onValueChange={setPaymentStatus}
        style={styles.input}
      >
        <Picker.Item label="Pending" value="Pending" />
        <Picker.Item label="Paid" value="Paid" />
        <Picker.Item label="Partial" value="Partial" />
      </Picker>

      {paymentStatus === 'Paid' && (
        <View>
          <Text style={styles.label}>Total Amount:</Text>
          <TextInput
            placeholder="Total Amount"
            value={amount}
            editable={false}
            style={[styles.input, styles.readOnlyInput]}
          />
          <Text style={styles.calculationInfo}>
            Calculation: {cylinders} cylinder(s) × ₹{PRICE_PER_CYLINDER} + ₹{SERVICE_FEES[serviceType]} ({serviceType} fee) = ₹{amount}
          </Text>
        </View>
      )}

      {paymentStatus === 'Partial' && (
        <View>
          <Text style={styles.label}>Partial Amount Paid:</Text>
          <TextInput
            placeholder="Amount Paid"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            style={styles.input}
          />
          <Text style={styles.calculationInfo}>
            Total Amount: ₹{cylinders * PRICE_PER_CYLINDER + SERVICE_FEES[serviceType]} ({cylinders} cylinders + {serviceType} fee)
          </Text>
        </View>
      )}

      <TouchableOpacity 
        style={styles.input} 
        onPress={() => setShowDatePicker(true)}
      >
        <Text>Delivery Date: {deliveryDate.toDateString()}</Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={deliveryDate}
          mode="date"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setDeliveryDate(date);
          }}
        />
      )}

      <Text style={styles.label}>Service Type:</Text>
      <View style={styles.serviceOptions}>
        <TouchableOpacity
          style={[
            styles.serviceButton,
            serviceType === 'Pickup' && styles.selectedService
          ]}
          onPress={() => handleServiceTypeSelection('Pickup')}
        >
          <Text>🚚 Pickup Only</Text>
          <Text style={styles.serviceFee}>+₹{SERVICE_FEES['Pickup']}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.serviceButton,
            serviceType === 'Drop' && styles.selectedService
          ]}
          onPress={() => handleServiceTypeSelection('Drop')}
        >
          <Text>🏠 Drop Only</Text>
          <Text style={styles.serviceFee}>+₹{SERVICE_FEES['Drop']}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.serviceButton,
            serviceType === 'Pickup + Drop' && styles.selectedService
          ]}
          onPress={() => handleServiceTypeSelection('Pickup + Drop')}
        >
          <Text>🔄 Pickup + Drop</Text>
          <Text style={styles.serviceFee}>+₹{SERVICE_FEES['Pickup + Drop']}</Text>
        </TouchableOpacity>
      </View>

      {/* Compact Pricing Summary - Before Booking Confirmation */}
      <View style={styles.finalPricingSummary}>
        <Text style={styles.finalPricingTitle}>📋 Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{cylinders} Cylinder{cylinders > 1 ? 's' : ''}</Text>
          <Text style={styles.summaryValue}>₹{cylinders * PRICE_PER_CYLINDER}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {serviceType === 'No' ? 'No Service' : `${serviceType} Service`}
          </Text>
          <Text style={[
            styles.summaryValue,
            serviceType === 'No' && styles.freeServiceText
          ]}>
            {serviceType === 'No' ? '0' : `₹${SERVICE_FEES[serviceType] || 0}`}
          </Text>
        </View>
        <View style={styles.totalSummaryRow}>
          <Text style={styles.totalSummaryLabel}>Total Amount</Text>
          <Text style={styles.totalSummaryValue}>₹{cylinders * PRICE_PER_CYLINDER + (SERVICE_FEES[serviceType] || 0)}</Text>
        </View>
      </View>

      <View style={styles.confirmButtonContainer}>
        <Button title="Confirm Booking" onPress={handleBooking} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  scrollContent: { 
    paddingBottom: 30,
    flexGrow: 1,
  },
  confirmButtonContainer: {
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10 },
  label: { marginBottom: 5, fontWeight: 'bold' },
  serviceOptions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  serviceButton: { padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 5 },
  selectedService: { backgroundColor: '#e3f2fd', borderColor: '#2196f3' },
  customerSearchContainer: { marginBottom: 15 },
  customerListContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderTopWidth: 0,
    maxHeight: 200,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  customerList: { maxHeight: 180 },
  customerItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  customerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  customerDetails: { fontSize: 14, color: '#666', marginTop: 2 },
  customerAddress: { fontSize: 12, color: '#999', marginTop: 2 },
  noResults: { padding: 15, textAlign: 'center', color: '#999', fontStyle: 'italic' },
  readOnlyInput: { backgroundColor: '#f5f5f5', color: '#666' },
  calculationInfo: { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 10 },
  serviceFee: { fontSize: 10, color: '#4CAF50', fontWeight: 'bold', marginTop: 2 },
  
  // Service Status Display
  serviceStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  serviceStatusLabel: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  serviceStatusValue: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  noServiceText: {
    color: '#6c757d',
    fontStyle: 'italic',
  },
  freeServiceText: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  
  // Compact Final Pricing Summary Styles
  finalPricingSummary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  finalPricingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#dee2e6',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '600',
  },
  totalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  totalSummaryLabel: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  totalSummaryValue: {
    fontSize: 18,
    color: '#1976d2',
    fontWeight: 'bold',
  },
});