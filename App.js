import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, FlatList, Switch, TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions, Modal, Alert, useColorScheme, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, updateDoc, where, getDocs } from 'firebase/firestore';
import { app, db } from './firebaseConfig';
import { Picker } from '@react-native-picker/picker';

// Import screens
import ExportScreen from './ExportScreen';
import DashboardScreen from './DashboardScreen';
import BookingScreen from './BookingScreen';
import BookingsListScreen from './BookingsListScreen';
import CustomersListScreen from './CustomersListScreen';
import InventoryScreen from './InventoryScreen';
import UpdateCylindersScreen from './UpdateCylindersScreen';
import ManageStovesScreen from './ManageStovesScreen';

const Stack = createNativeStackNavigator();

// Add Customer Screen Component
function AddCustomerScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const getColors = (isDark) => ({
    background: isDark ? '#121212' : '#ffffff',
    surface: isDark ? '#1e1e1e' : '#f8f9fa',
    card: isDark ? '#2d2d2d' : '#ffffff',
    text: isDark ? '#ffffff' : '#000000',
    textSecondary: isDark ? '#b0b0b0' : '#666666',
    border: isDark ? '#404040' : '#e0e0e0',
    primary: '#007AFF',
    danger: isDark ? '#f44336' : '#dc3545',
    warning: isDark ? '#ff9800' : '#ffc107'
  });

  const colors = getColors(isDark);
  const styles = createStyles(colors);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [cylinders, setCylinders] = useState(1);
  const [cylinderType, setCylinderType] = useState('14.2kg');
  const [category, setCategory] = useState('Domestic');
  const [gender, setGender] = useState('Male');
  const [subsidy, setSubsidy] = useState(false);
  const [bookId, setBookId] = useState('');

  const addCustomer = async () => {
    // Validate required fields
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter phone number');
      return;
    }

    // Validate phone number (exactly 10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone.trim())) {
      Alert.alert('Error', 'Phone number must be exactly 10 digits');
      return;
    }

    // Validate Book ID based on category
    if (category === 'Domestic') {
      if (!bookId.trim()) {
        Alert.alert('Error', 'Book ID is required for domestic customers');
        return;
      }
      
      // Check if Book ID is unique for domestic customers
      try {
        const bookIdQuery = query(
          collection(db, "customers"), 
          where("bookId", "==", bookId.trim()),
          where("category", "==", "Domestic")
        );
        const bookIdSnapshot = await getDocs(bookIdQuery);
        
        if (!bookIdSnapshot.empty) {
          Alert.alert('Error', 'This Book ID is already used by another domestic customer');
          return;
        }
      } catch (error) {
        console.error("Error checking Book ID uniqueness: ", error);
        Alert.alert('Error', 'Failed to validate Book ID. Please try again.');
        return;
      }
    }

    // Check if phone number is unique
    try {
      const phoneQuery = query(
        collection(db, "customers"), 
        where("phone", "==", phone.trim())
      );
      const phoneSnapshot = await getDocs(phoneQuery);
      
      if (!phoneSnapshot.empty) {
        Alert.alert('Error', 'This phone number is already registered');
        return;
      }
    } catch (error) {
      console.error("Error checking phone uniqueness: ", error);
      Alert.alert('Error', 'Failed to validate phone number. Please try again.');
      return;
    }

    try {
      await addDoc(collection(db, "customers"), {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        cylinders: parseInt(cylinders),
        cylinderType,
        category,
        gender,
        subsidy,
        bookId: bookId.trim(),
        createdAt: new Date(),
        payment: {
          lastPaymentDate: null,
          status: 'pending'
        },
        paymentHistory: []
      });
      
      Alert.alert('Success', 'Customer added successfully!');
      navigation.goBack();
    } catch (error) {
      console.error("Error adding customer: ", error);
      Alert.alert('Error', 'Failed to add customer. Please try again.');
    }
  };

  const incrementCylinders = () => {
    setCylinders(prev => prev + 1);
  };

  const decrementCylinders = () => {
    setCylinders(prev => prev > 1 ? prev - 1 : 1);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
        translucent={true}
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollViewContent}
        >
        <View style={styles.form}>
          {/* View Customers List Button */}
          <TouchableOpacity 
            style={[styles.viewCustomersButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('CustomersListScreen')}
          >
            <Text style={styles.viewCustomersButtonText}>VIEW CUSTOMERS LIST</Text>
          </TouchableOpacity>

          {/* Full Name */}
          <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Enter full name"
            placeholderTextColor={colors.textSecondary}
          />

          {/* Book ID */}
          <Text style={[styles.label, { color: colors.text }]}>
            Book ID (16 alphanumeric characters)
            {category === 'Domestic' && <Text style={[styles.requiredAsterisk, { color: colors.error || '#FF3B30' }]}> *</Text>}
            {category === 'Commercial' && <Text style={[styles.optionalText, { color: colors.textSecondary }]}> (Optional)</Text>}
          </Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.surface, 
              color: colors.text, 
              borderColor: category === 'Domestic' ? (bookId.trim() ? colors.border : colors.error || '#FF3B30') : colors.border 
            }]}
            value={bookId}
            onChangeText={setBookId}
            placeholder={category === 'Domestic' ? "Enter book ID (Required)" : "Enter book ID (Optional)"}
            placeholderTextColor={colors.textSecondary}
            maxLength={16}
          />

          {/* Gender */}
          <Text style={[styles.label, { color: colors.text }]}>Gender:</Text>
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Picker
              selectedValue={gender}
              onValueChange={setGender}
              style={[styles.picker, { color: colors.text }]}
            >
              <Picker.Item label="Male" value="Male" />
              <Picker.Item label="Female" value="Female" />
              <Picker.Item label="Other" value="Other" />
            </Picker>
          </View>

          {/* Category */}
          <Text style={[styles.label, { color: colors.text }]}>Category:</Text>
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Picker
              selectedValue={category}
              onValueChange={setCategory}
              style={[styles.picker, { color: colors.text }]}
            >
              <Picker.Item label="Domestic" value="Domestic" />
              <Picker.Item label="Commercial" value="Commercial" />
            </Picker>
          </View>

          {/* Subsidy Applicable */}
          <View style={[styles.subsidyContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.subsidyLabel, { color: colors.text }]}>Subsidy Applicable?</Text>
            <Switch
              value={subsidy}
              onValueChange={setSubsidy}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={subsidy ? '#ffffff' : '#f4f3f4'}
              ios_backgroundColor={colors.border}
            />
          </View>

          {/* Phone */}
          <Text style={[styles.label, { color: colors.text }]}>
            Phone number📞<Text style={[styles.requiredAsterisk, { color: colors.error || '#FF3B30' }]}>*</Text>
            
          </Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.surface, 
              color: colors.text, 
              borderColor: phone.trim() && !/^\d{10}$/.test(phone.trim()) ? colors.error || '#FF3B30' : colors.border 
            }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone number"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            maxLength={10}
          />

          {/* Address */}
          <Text style={[styles.label, { color: colors.text }]}>Address📍</Text>
          <TextInput
            style={[styles.input, styles.addressInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={address}
            onChangeText={setAddress}
            placeholder="Enter address"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
          />

          {/* Number of Cylinders */}
          <Text style={[styles.label, { color: colors.text }]}>Number of Cylinders:</Text>
          <View style={styles.cylinderCountContainer}>
            <TouchableOpacity 
              style={[styles.cylinderButton, { backgroundColor: colors.primary }]}
              onPress={decrementCylinders}
            >
              <Text style={styles.cylinderButtonText}>−</Text>
            </TouchableOpacity>
            <View style={[styles.cylinderCountDisplay, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cylinderCountText, { color: colors.text }]}>{cylinders}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.cylinderButton, { backgroundColor: colors.primary }]}
              onPress={incrementCylinders}
            >
              <Text style={styles.cylinderButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Cylinder Type */}
          <Text style={[styles.label, { color: colors.text }]}>Cylinder Type:</Text>
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Picker
              selectedValue={cylinderType}
              onValueChange={setCylinderType}
              style={[styles.picker, { color: colors.text }]}
            >
              <Picker.Item label="14.2kg" value="14.2kg" />
              <Picker.Item label="19kg" value="19kg" />
              <Picker.Item label="5kg" value="5kg" />
            </Picker>
          </View>

          {/* Save Customer Button */}
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={addCustomer}
          >
            <Text style={styles.saveButtonText}>SAVE CUSTOMER</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Edit Customer Screen Component  
function EditCustomerScreen({ navigation, route }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const getColors = (isDark) => ({
    background: isDark ? '#121212' : '#ffffff',
    surface: isDark ? '#1e1e1e' : '#f8f9fa',
    card: isDark ? '#2d2d2d' : '#ffffff',
    text: isDark ? '#ffffff' : '#000000',
    textSecondary: isDark ? '#b0b0b0' : '#666666',
    border: isDark ? '#404040' : '#e0e0e0',
    primary: isDark ? '#4CAF50' : '#28a745',
    danger: isDark ? '#f44336' : '#dc3545',
    warning: isDark ? '#ff9800' : '#ffc107'
  });

  const colors = getColors(isDark);
  const styles = createStyles(colors);

  const { customer } = route.params;
  
  const [name, setName] = useState(customer.name || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [address, setAddress] = useState(customer.address || '');
  const [cylinders, setCylinders] = useState(customer.cylinders?.toString() || '1');
  const [cylinderType, setCylinderType] = useState(customer.cylinderType || '14.2kg');
  const [category, setCategory] = useState(customer.category || 'Domestic');
  const [subsidy, setSubsidy] = useState(customer.subsidy || false);
  const [bookId, setBookId] = useState(customer.bookId || '');

  const updateCustomer = async () => {
    // Validate required fields
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter phone number');
      return;
    }

    // Validate phone number (exactly 10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone.trim())) {
      Alert.alert('Error', 'Phone number must be exactly 10 digits');
      return;
    }

    // Validate Book ID based on category
    if (category === 'Domestic') {
      if (!bookId.trim()) {
        Alert.alert('Error', 'Book ID is required for domestic customers');
        return;
      }
      
      // Check if Book ID is unique for domestic customers (excluding current customer)
      try {
        const bookIdQuery = query(
          collection(db, "customers"), 
          where("bookId", "==", bookId.trim()),
          where("category", "==", "Domestic")
        );
        const bookIdSnapshot = await getDocs(bookIdQuery);
        
        // Check if any other customer has this Book ID
        const duplicateCustomer = bookIdSnapshot.docs.find(doc => doc.id !== customer.id);
        if (duplicateCustomer) {
          Alert.alert('Error', 'This Book ID is already used by another domestic customer');
          return;
        }
      } catch (error) {
        console.error("Error checking Book ID uniqueness: ", error);
        Alert.alert('Error', 'Failed to validate Book ID. Please try again.');
        return;
      }
    }

    // Check if phone number is unique (excluding current customer)
    try {
      const phoneQuery = query(
        collection(db, "customers"), 
        where("phone", "==", phone.trim())
      );
      const phoneSnapshot = await getDocs(phoneQuery);
      
      // Check if any other customer has this phone number
      const duplicateCustomer = phoneSnapshot.docs.find(doc => doc.id !== customer.id);
      if (duplicateCustomer) {
        Alert.alert('Error', 'This phone number is already registered to another customer');
        return;
      }
    } catch (error) {
      console.error("Error checking phone uniqueness: ", error);
      Alert.alert('Error', 'Failed to validate phone number. Please try again.');
      return;
    }

    try {
      const customerRef = doc(db, "customers", customer.id);
      await updateDoc(customerRef, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        cylinders: parseInt(cylinders),
        cylinderType,
        category,
        subsidy,
        bookId: bookId.trim(),
        updatedAt: new Date()
      });
      
      Alert.alert('Success', 'Customer updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error("Error updating customer: ", error);
      Alert.alert('Error', 'Failed to update customer. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
        translucent={true}
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.text }]}>Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Enter customer name"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={[styles.label, { color: colors.text }]}>Phone *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { color: colors.text }]}>Address</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={address}
            onChangeText={setAddress}
            placeholder="Enter address"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
          />

          <Text style={[styles.label, { color: colors.text }]}>Book ID</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={bookId}
            onChangeText={setBookId}
            placeholder="Enter book ID (optional)"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={[styles.label, { color: colors.text }]}>Category</Text>
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Picker
              selectedValue={category}
              onValueChange={setCategory}
              style={[styles.picker, { color: colors.text }]}
            >
              <Picker.Item label="Domestic" value="Domestic" />
              <Picker.Item label="Commercial" value="Commercial" />
            </Picker>
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Number of Cylinders</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={cylinders}
            onChangeText={setCylinders}
            placeholder="Enter number of cylinders"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />

          <Text style={[styles.label, { color: colors.text }]}>Cylinder Type</Text>
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Picker
              selectedValue={cylinderType}
              onValueChange={setCylinderType}
              style={[styles.picker, { color: colors.text }]}
            >
              <Picker.Item label="14.2kg" value="14.2kg" />
              <Picker.Item label="19kg" value="19kg" />
              <Picker.Item label="5kg" value="5kg" />
            </Picker>
          </View>

          <View style={styles.switchContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Subsidy Eligible</Text>
            <Switch
              value={subsidy}
              onValueChange={setSubsidy}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={subsidy ? colors.surface : colors.textSecondary}
            />
          </View>

          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={updateCustomer}
          >
            <Text style={styles.addButtonText}>Update Customer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, marginBottom: 10, textAlign: 'center' }}>
            Something went wrong!
          </Text>
          <Text style={{ color: '#666', textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Styles function for the form screens
const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  form: {
    padding: 12,
    paddingTop: 8,
  },
  viewCustomersButton: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  viewCustomersButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
    minHeight: 45,
    textAlignVertical: 'center',
  },
  addressInput: {
    height: 70,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 10,
    minHeight: 45,
    justifyContent: 'center',
  },
  picker: {
    height: 53,
    marginVertical: 0,
  },
  subsidyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 6,
    minHeight: 45,
  },
  subsidyLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  cylinderCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  cylinderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cylinderButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cylinderCountDisplay: {
    marginHorizontal: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 6,
    minWidth: 45,
    alignItems: 'center',
  },
  cylinderCountText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  addButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  requiredAsterisk: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionalText: {
    fontSize: 12,
    fontWeight: 'normal',
    fontStyle: 'italic',
  },
});

// Main App Component
export default function App() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <ErrorBoundary>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#1a1a1a' : '#f8f9fa'}
        translucent={true}
      />
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Dashboard"
          screenOptions={{
            headerStyle: {
              backgroundColor: isDark ? '#1a1a1a' : '#f8f9fa',
              height: 60, // Reduced global header height
              elevation: 2,
              shadowOpacity: 0.1,
            },
            headerTintColor: isDark ? '#ffffff' : '#000000',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 20,
            },
            headerStatusBarHeight: 0, // Remove extra status bar height
            headerTitleContainerStyle: {
              paddingTop: 0,
              paddingBottom: 0,
            },
            headerLeftContainerStyle: {
              paddingLeft: 8,
            },
            headerRightContainerStyle: {
              paddingRight: 8,
            },
            headerBackTitleVisible: true, // Show back title for more space
            headerTitleAlign: 'center',
          }}
        >
          <Stack.Screen 
            name="Dashboard" 
            component={DashboardScreen}
            options={{
              title: "LPG MAP📍",
              headerShown: true,
            }}
          />
          <Stack.Screen 
            name="CustomersListScreen" 
            component={CustomersListScreen}
            options={{
              title: "Customers",
            }}
          />
          <Stack.Screen 
            name="BookingsListScreen" 
            component={BookingsListScreen}
            options={{
              title: "Today's orders",
            }}
          />
          <Stack.Screen 
            name="InventoryScreen" 
            component={InventoryScreen}
            options={{
              title: "Inventory Status",
            }}
          />
          <Stack.Screen 
            name="AddCustomer" 
            component={AddCustomerScreen}
            options={{
              title: "Add New Customer",
              headerStyle: {
                backgroundColor: isDark ? '#1a1a1a' : '#f8f9fa',
                height: 60, // Same as global height
                elevation: 2,
                shadowOpacity: 0.1,
              },
              headerTitleStyle: {
                fontWeight: 'bold',
                fontSize: 16,
              },
            }}
          />
          <Stack.Screen 
            name="EditCustomer" 
            component={EditCustomerScreen}
            options={{
              title: "Edit Customer",
            }}
          />
          <Stack.Screen 
            name="BookingScreen" 
            component={BookingScreen}
            options={{
              title: "Book Cylinder",
            }}
          />
          <Stack.Screen 
            name="ExportScreen" 
            component={ExportScreen}
            options={{
              title: "Export Data",
            }}
          />
          <Stack.Screen 
            name="UpdateCylinders" 
            component={UpdateCylindersScreen}
            options={{
              title: "Update Cylinders",
            }}
          />
          <Stack.Screen 
            name="ManageStoves" 
            component={ManageStovesScreen}
            options={{
              title: "Manage Stoves",
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}
