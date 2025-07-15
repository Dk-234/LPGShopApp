import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, TouchableOpacity, Switch, useColorScheme } from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { getCustomers, addBooking, addMultipleCylinders, removeCylinders, getCurrentUserPhone, getUserPricing, updateUserPricing } from './dataService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

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

export default function BookingScreen({ route, navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const styles = createStyles(colors);
  const { customerId } = route.params || {};
  const [customer, setCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [cylinders, setCylinders] = useState(1);
  const [cylinderType, setCylinderType] = useState('14.2kg');
  const [dscNumber, setDscNumber] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const [amount, setAmount] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date());
  const [serviceType, setServiceType] = useState('No');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [emptyCylinderReceived, setEmptyCylinderReceived] = useState(false);

  // Price per cylinder type - loaded from Firebase
  const [CYLINDER_PRICES, setCYLINDER_PRICES] = useState({
    '14.2kg': 850,
    '5kg': 400,
    '19kg': 1200
  });

  // Editable service fees
  const [serviceFees, setServiceFees] = useState({
    'No': 0,
    'Pickup': 0,
    'Drop': 0,
    'Pickup + Drop': 0
  });

  // Service fees for calculations
  const SERVICE_FEES = serviceFees;

  // Load prices and service fees from Firebase (user-specific)
  const loadPrices = async () => {
    try {
      const userPhone = await getCurrentUserPhone();
      const pricing = await getUserPricing(userPhone);
      setCYLINDER_PRICES(pricing.cylinderPrices);
      setServiceFees(pricing.serviceFees);
    } catch (error) {
      console.error("Error loading prices and fees:", error);
      // Set default values if error
      setCYLINDER_PRICES({
        '5 kg': 400,
        '14.2 kg': 850,
        '19 kg': 1200
      });
      setServiceFees({
        'No': 0,
        'Pickup': 0,
        'Drop': 0,
        'Pickup + Drop': 0
      });
    }
  };

  // Load prices on component mount
  useEffect(() => {
    loadPrices();
  }, []);

  // Fetch all customers for dropdown if no customerId provided
  useEffect(() => {
    if (!customerId) {
      const loadCustomers = async () => {
        try {
          const customersList = await getCustomers();
          setCustomers(customersList);
          setFilteredCustomers(customersList);
        } catch (error) {
          console.error('Error loading customers:', error);
        }
      };
      loadCustomers();
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
      const cylinderCost = cylinders * (CYLINDER_PRICES[cylinderType] || 0);
      const serviceFee = serviceFees[serviceType] || 0;
      const totalAmount = cylinderCost + serviceFee;
      setAmount(totalAmount.toString());
    } else if (paymentStatus === 'Pending') {
      setAmount('');
    }
  }, [paymentStatus, cylinders, serviceType, cylinderType, CYLINDER_PRICES, serviceFees]);

  // Fetch customer details
  useEffect(() => {
    const fetchCustomer = async () => {
      const customerIdToFetch = customerId || selectedCustomerId;
      if (customerIdToFetch) {
        const docRef = doc(db, "customers", customerIdToFetch);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const customerData = docSnap.data();
          setCustomer(customerData);
          // Set cylinder type to customer's registered type
          if (customerData.cylinderType) {
            setCylinderType(customerData.cylinderType);
          }
        }
      }
    };
    fetchCustomer();
  }, [customerId, selectedCustomerId]);

  const handleCustomerSelection = (customer) => {
    setSelectedCustomerId(customer.id);
    setCustomer(customer);
    setSearchQuery(customer.name);
    setShowCustomerList(false);
    // Set cylinder type to customer's registered type
    if (customer.cylinderType) {
      setCylinderType(customer.cylinderType);
    }
  };

  // Function to clear the form
  const clearForm = () => {
    if (!customerId) {
      // Only clear customer selection if not passed from navigation
      setSelectedCustomerId('');
      setCustomer(null);
      setSearchQuery('');
      setShowCustomerList(false);
    }
    setCylinders(1);
    setCylinderType('14.2kg');
    setDscNumber('');
    setPaymentStatus('Pending');
    setAmount('');
    setDeliveryDate(new Date());
    setServiceType('No');
    setEmptyCylinderReceived(false);
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

  const saveServiceFees = async () => {
    try {
      const userPhone = await getCurrentUserPhone();
      await updateUserPricing(userPhone, null, serviceFees); // Only update service fees
      alert("Service fees saved successfully!");
    } catch (error) {
      console.error("Error saving service fees:", error);
      alert("Error saving service fees. Please try again.");
    }
  };

  const handleBooking = async () => {
    const customerIdToBook = customerId || selectedCustomerId;
    if (!customerIdToBook) {
      alert("Please select a customer!");
      return;
    }

    // Validate DAC number (4 digits)
    if (!dscNumber.trim()) {
      alert("Please enter DAC number!");
      return;
    }

    if (!/^\d{4}$/.test(dscNumber)) {
      alert("DAC number must be exactly 4 digits!");
      return;
    }

    // Validate cylinder count against registered cylinders
    const currentCustomer = customer || customers.find(c => c.id === customerIdToBook);
    if (currentCustomer) {
      const registeredCylinders = currentCustomer.cylinders || 1;
      if (cylinders > registeredCylinders) {
        alert(`Cannot book ${cylinders} cylinders. Customer is registered for only ${registeredCylinders} cylinder${registeredCylinders > 1 ? 's' : ''}. Please update customer registration first.`);
        return;
      }
      
      // Validate cylinder type matches registered type
      const registeredType = currentCustomer.cylinderType || '14.2kg';
      if (cylinderType !== registeredType) {
        alert(`Cannot book ${cylinderType} cylinders. Customer is registered for ${registeredType} cylinders. Please update customer registration first or select the correct cylinder type.`);
        return;
      }
    }

    // Validate delivery date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDeliveryDate = new Date(deliveryDate);
    selectedDeliveryDate.setHours(0, 0, 0, 0);
    
    if (selectedDeliveryDate < today) {
      alert("Delivery date cannot be in the past!");
      return;
    }
    
    try {
      await addBooking({
        customerId: customerIdToBook,
        cylinders,
        cylinderType,
        dscNumber: dscNumber,
        payment: { status: paymentStatus, amount },
        deliveryDate,
        serviceType,
        status: "Booked",
        emptyCylinderReceived: (serviceType === 'Drop' || serviceType === 'Pickup + Drop') ? emptyCylinderReceived : false,
      });

      // Update inventory if empty cylinder was received during booking
      if ((serviceType === 'Drop' || serviceType === 'Pickup + Drop') && emptyCylinderReceived) {
        await updateInventory(cylinderType, 'addEmpty', cylinders);
      }

      alert("Booking confirmed!");
      
      // Clear the form
      clearForm();
      
      // Navigate back to dashboard
      if (navigation) {
        navigation.navigate('Dashboard');
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  // Inventory update functions
  const updateInventory = async (cylinderType, action, quantity = 1) => {
    try {
      if (action === 'addEmpty') {
        // Add empty cylinders to inventory using dataService
        await addMultipleCylinders({
          type: cylinderType,
          status: "EMPTY"
        }, quantity);
        console.log(`Successfully added ${quantity} empty ${cylinderType} cylinders to inventory`);
      } else if (action === 'removeFull') {
        // Remove full cylinders from inventory using dataService
        await removeCylinders(cylinderType, "FULL", quantity);
        console.log(`Successfully removed ${quantity} full ${cylinderType} cylinders from inventory`);
      }
    } catch (error) {
      console.error("Error updating inventory:", error);
      // Don't throw error to avoid breaking the booking process
      if (error.message && error.message.includes('insufficient:')) {
        console.warn(`Inventory warning: ${error.message}`);
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>
        {customerId ? `Book Cylinder for ${customer?.name || 'Loading...'}` : 'Book Cylinder'}
      </Text>

      {/* Display customer details when pre-selected */}
      {customerId && customer && (
        <View style={styles.customerInfoCard}>
          <Text style={styles.customerInfoTitle}>📋 Customer Details</Text>
          <View style={styles.customerInfoRow}>
            <Text style={styles.customerInfoLabel}>Name:</Text>
            <Text style={styles.customerInfoValue}>{customer.name}</Text>
          </View>
          <View style={styles.customerInfoRow}>
            <Text style={styles.customerInfoLabel}>Phone:</Text>
            <Text style={styles.customerInfoValue}>{customer.phone}</Text>
          </View>
          {customer.address && (
            <View style={styles.customerInfoRow}>
              <Text style={styles.customerInfoLabel}>Address:</Text>
              <Text style={styles.customerInfoValue}>{customer.address}</Text>
            </View>
          )}
          {customer.bookId && (
            <View style={styles.customerInfoRow}>
              <Text style={styles.customerInfoLabel}>Book ID:</Text>
              <Text style={styles.customerInfoValue}>{customer.bookId}</Text>
            </View>
          )}
          {customer.category && (
            <View style={styles.customerInfoRow}>
              <Text style={styles.customerInfoLabel}>Category:</Text>
              <Text style={styles.customerInfoValue}>{customer.category}</Text>
            </View>
          )}
          <View style={styles.customerInfoRow}>
            <Text style={styles.customerInfoLabel}>Cylinders:</Text>
            <Text style={styles.customerInfoValue}>{customer.cylinders || 1} × {customer.cylinderType || '14.2kg'}</Text>
          </View>
          {customer.subsidy && (
            <View style={styles.subsidyIndicator}>
              <Text style={styles.subsidyText}>💰 Subsidy Applicable</Text>
            </View>
          )}
        </View>
      )}

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

      <Text style={styles.label}>
        Cylinder Type:
        {customer && (
          <Text style={styles.cylinderLimit}> (Registered: {customer.cylinderType || '14.2kg'})</Text>
        )}
      </Text>
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

      <Text style={styles.label}>
        Number of Cylinders:
        {customer && (
          <Text style={styles.cylinderLimit}> (Max: {customer.cylinders || 1})</Text>
        )}
      </Text>
      <View style={styles.counterContainer}>
        <TouchableOpacity 
          style={[styles.counterButton, cylinders <= 1 && styles.disabledButton]}
          onPress={() => setCylinders(Math.max(1, cylinders - 1))}
          disabled={cylinders <= 1}
        >
          <Text style={[styles.counterButtonText, cylinders <= 1 && styles.disabledButtonText]}>−</Text>
        </TouchableOpacity>
        <View style={styles.counterDisplay}>
          <Text style={styles.counterValue}>{cylinders}</Text>
        </View>
        <TouchableOpacity 
          style={[
            styles.counterButton, 
            (cylinders >= (customer?.cylinders || 10)) && styles.disabledButton
          ]}
          onPress={() => {
            const maxCylinders = customer?.cylinders || 10;
            setCylinders(Math.min(maxCylinders, cylinders + 1));
          }}
          disabled={cylinders >= (customer?.cylinders || 10)}
        >
          <Text style={[
            styles.counterButtonText, 
            (cylinders >= (customer?.cylinders || 10)) && styles.disabledButtonText
          ]}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>DAC Number (4 digits):</Text>
      <TextInput
        placeholder="Enter 4-digit DAC number"
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
            Calculation: {cylinders} × {cylinderType} (₹{CYLINDER_PRICES[cylinderType]} each) + ₹{SERVICE_FEES[serviceType]} ({serviceType} fee) = ₹{amount}
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
            Total Amount: ₹{cylinders * CYLINDER_PRICES[cylinderType] + SERVICE_FEES[serviceType]} ({cylinders} × {cylinderType} + {serviceType} fee)
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
          minimumDate={new Date()} // Prevent selection of past dates
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              // Additional validation to ensure selected date is not in the past
              const today = new Date();
              today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
              const selectedDate = new Date(date);
              selectedDate.setHours(0, 0, 0, 0);
              
              if (selectedDate >= today) {
                setDeliveryDate(date);
              } else {
                // If somehow a past date is selected, default to today
                setDeliveryDate(new Date());
                alert("Delivery date cannot be in the past. Setting to today's date.");
              }
            }
          }}
        />
      )}

      {/* Editable Service Fees Section */}
      <View style={[styles.serviceFeeEditor, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.serviceFeeTitle, { color: colors.text }]}>🔧 Edit Service Fees (For This Booking)</Text>
        <View style={styles.feeInputRow}>
          <Text style={[styles.feeLabel, { color: colors.text }]}>Pickup Fee:</Text>
          <TextInput
            style={[styles.feeInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
            value={serviceFees.Pickup?.toString() || '0'}
            onChangeText={(text) => setServiceFees(prev => ({...prev, Pickup: parseInt(text) || 0}))}
            keyboardType="numeric"
            placeholder=""
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View style={styles.feeInputRow}>
          <Text style={[styles.feeLabel, { color: colors.text }]}>Drop Fee:</Text>
          <TextInput
            style={[styles.feeInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
            value={serviceFees.Drop?.toString() || '0'}
            onChangeText={(text) => setServiceFees(prev => ({...prev, Drop: parseInt(text) || 0}))}
            keyboardType="numeric"
            placeholder=""
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View style={styles.feeInputRow}>
          <Text style={[styles.feeLabel, { color: colors.text }]}>Pickup + Drop:</Text>
          <TextInput
            style={[styles.feeInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
            value={serviceFees['Pickup + Drop']?.toString() || '0'}
            onChangeText={(text) => setServiceFees(prev => ({...prev, 'Pickup + Drop': parseInt(text) || 0}))}
            keyboardType="numeric"
            placeholder=""
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <TouchableOpacity 
          style={[styles.saveFeesButton, { backgroundColor: colors.primary }]} 
          onPress={saveServiceFees}
        >
          <Text style={styles.saveFeesButtonText}>💾 Save Service Fees for All Future Bookings</Text>
        </TouchableOpacity>
      </View>

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

      {/* Empty Cylinder Checkbox - Only show for Drop services */}
      {(serviceType === 'Drop' || serviceType === 'Pickup + Drop') && (
        <View style={styles.checkboxContainer}>
          <Text style={styles.checkboxLabel}>Empty cylinder received:</Text>
          <Switch
            value={emptyCylinderReceived}
            onValueChange={setEmptyCylinderReceived}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={emptyCylinderReceived ? '#007AFF' : '#f4f3f4'}
          />
        </View>
      )}

      {/* Compact Pricing Summary - Before Booking Confirmation */}
      <View style={styles.finalPricingSummary}>
        <Text style={styles.finalPricingTitle}>📋 Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{cylinders} × {cylinderType} (₹{CYLINDER_PRICES[cylinderType]} each)</Text>
          <Text style={styles.summaryValue}>₹{cylinders * CYLINDER_PRICES[cylinderType]}</Text>
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
          <Text style={styles.totalSummaryValue}>₹{cylinders * CYLINDER_PRICES[cylinderType] + (SERVICE_FEES[serviceType] || 0)}</Text>
        </View>
      </View>

      <View style={styles.confirmButtonContainer}>
        <Button title="Confirm Booking" onPress={handleBooking} />
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20,
    backgroundColor: colors.background,
  },
  scrollContent: { 
    paddingBottom: 30,
    flexGrow: 1,
  },
  confirmButtonContainer: {
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 20,
    color: colors.text,
  },
  input: { 
    borderWidth: 1, 
    borderColor: colors.inputBorder, 
    padding: 10, 
    marginBottom: 10,
    backgroundColor: colors.inputBackground,
    color: colors.text,
  },
  label: { 
    marginBottom: 5, 
    fontWeight: 'bold',
    color: colors.text,
  },
  cylinderLimit: { 
    fontSize: 12, 
    color: colors.textSecondary, 
    fontWeight: 'normal',
  },
  serviceOptions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  serviceButton: { padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 5 },
  selectedService: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  customerSearchContainer: { marginBottom: 15 },
  customerListContainer: {
    borderWidth: 1,
    borderColor: colors.border,
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
  
  // New styles for cylinder type picker and counter
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.inputBackground,
    marginBottom: 15,
  },
  picker: {
    height: 50,
    color: colors.text,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  counterButton: {
    backgroundColor: '#007bff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  counterButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  counterDisplay: {
    backgroundColor: 'white',
    minWidth: 80,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  counterValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  disabledButton: {
    backgroundColor: colors.border,
  },
  disabledButtonText: {
    color: colors.textSecondary,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    padding: 15,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkboxLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  // Customer info card styles
  customerInfoCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  customerInfoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  customerInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 80,
  },
  customerInfoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    flexWrap: 'wrap',
  },
  subsidyIndicator: {
    backgroundColor: '#d4edda',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  subsidyText: {
    color: '#155724',
    fontWeight: 'bold',
    fontSize: 12,
  },
  serviceFeeEditor: {
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
  },
  serviceFeeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  feeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 100,
  },
  feeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 5,
    padding: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  saveFeesButton: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveFeesButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});