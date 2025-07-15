import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, FlatList, useColorScheme } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { 
  getInventoryCounts, 
  subscribeToInventoryUpdates, 
  getCylinders, 
  getStoves, 
  addCylinder, 
  updateCylinder, 
  deleteCylinder,
  addStove,
  updateStove,
  deleteStove,
  getCustomers,
  addMultipleCylinders,
  removeCylinders,
  getLendingRecords,
  addLendingRecord,
  updateLendingRecord,
  deleteLendingRecord,
  getLendingHistory
} from './dataService';

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

export default function InventoryScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const styles = createStyles(colors);

  const [counts, setCounts] = useState({
    fullCylinders: 0,
    emptyCylinders: 0,
    availableStoves: 0,
    lentStoves: 0,
  });
  
  // Detailed cylinder counts by type
  const [cylinderCounts, setCylinderCounts] = useState({
    "14.2kg": { FULL: 0, EMPTY: 0 },
    "5kg": { FULL: 0, EMPTY: 0 },
    "19kg": { FULL: 0, EMPTY: 0 }
  });

  // Customer counts by category
  const [customerCounts, setCustomerCounts] = useState({
    domestic: 0,
    commercial: 0,
    subsidy: 0,
  });

  // Modal states
  const [cylinderModalVisible, setCylinderModalVisible] = useState(false);
  const [stoveModalVisible, setStoveModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Detail modal states
  const [detailType, setDetailType] = useState(''); // 'cylinders' or 'stoves'
  const [detailData, setDetailData] = useState([]);
  const [detailTitle, setDetailTitle] = useState('');

  // Cylinder form states
  const [cylinderAction, setCylinderAction] = useState("ADD"); // ADD, REMOVE, or MOVE_TO_EMPTY
  const [cylinderType, setCylinderType] = useState("14.2kg");
  const [cylinderStatus, setCylinderStatus] = useState("FULL");
  const [cylinderQuantity, setCylinderQuantity] = useState("1");

  // Stove form states
  const [stoveAction, setStoveAction] = useState("ADD"); // ADD, LEND, or REMOVE
  const [stoveModel, setStoveModel] = useState("Single Burner");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("PAID"); // PAID or PENDING
  const [availableStoves, setAvailableStoves] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [lentStovesDetails, setLentStovesDetails] = useState([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [lendingHistoryVisible, setLendingHistoryVisible] = useState(false);
  const [lendingHistory, setLendingHistory] = useState([]);

  const fetchInventory = async () => {
    try {
      // Get user-specific inventory counts
      const { cylinderCounts, counts } = await getInventoryCounts();
      const customers = await getCustomers();
      const stoves = await getStoves();
      
      setCylinderCounts(cylinderCounts);
      setCounts(counts);
      
      // Store customers for selection
      setCustomers(customers);
      setFilteredCustomers(customers); // Initialize filtered list
      
      // Store available stoves for lending
      const availableStovesList = stoves.filter(stove => stove.status === "AVAILABLE");
      setAvailableStoves(availableStovesList);

      // Store lent stoves with customer details
      const lentStoves = stoves.filter(stove => stove.status === "LENT").map(stove => {
        // First try to get customer details from stove document, then fallback to customer lookup
        const customer = customers.find(c => c.id === stove.customerId);
        const customerName = stove.customerName || customer?.name || "Unknown Customer";
        const customerPhone = stove.customerPhone || customer?.phone || "N/A";
        const customerAddress = stove.customerAddress || customer?.address || "N/A";
        
        return { 
          id: stove.id, 
          ...stove,
          customerName,
          customerPhone,
          customerDetails: {
            name: customerName,
            phone: customerPhone,
            address: customerAddress
          }
        };
      });
      setLentStovesDetails(lentStoves);

      // Count customers by category
      let domesticCount = 0;
      let commercialCount = 0;
      let subsidyCount = 0;
      
      customers.forEach((customer) => {
        if (customer.category === "Domestic") domesticCount++;
        if (customer.category === "Commercial") commercialCount++;
        if (customer.subsidy === true) subsidyCount++;
      });
      
      setCustomerCounts({
        domestic: domesticCount,
        commercial: commercialCount,
        subsidy: subsidyCount,
      });

      // Check for auto-deletion of lending records (28 days after return)
      await checkAutoDeleteLendingRecords();
    } catch (error) {
      console.error("Error fetching inventory:", error);
      Alert.alert("Error", "Failed to fetch inventory data");
    }
  };

  // Check for auto-deletion of lending records (28 days after return)
  const checkAutoDeleteLendingRecords = async () => {
    try {
      const lendingRecords = await getLendingRecords();
      const returnedRecords = lendingRecords.filter(record => record.status === "RETURNED");
      
      const now = new Date();
      const deletionPromises = [];

      returnedRecords.forEach((record) => {
        if (record.returnedAt) {
          const returnDate = record.returnedAt.toDate ? record.returnedAt.toDate() : new Date(record.returnedAt);
          const daysSinceReturn = (now - returnDate) / (1000 * 60 * 60 * 24);
          
          if (daysSinceReturn >= 28) {
            console.log(`Auto-deleting lending record ${record.id} after 28 days`);
            deletionPromises.push(deleteLendingRecord(record.id));
          }
        }
      });

      if (deletionPromises.length > 0) {
        await Promise.all(deletionPromises);
        console.log(`Auto-deleted ${deletionPromises.length} lending record(s)`);
      }
    } catch (error) {
      console.error("Error in auto-deletion check:", error);
    }
  };

  // Real-time updates
  useEffect(() => {
    let unsubscribe;
    
    const setupSubscription = async () => {
      unsubscribe = await subscribeToInventoryUpdates(() => {
        fetchInventory();
      });
    };
    
    setupSubscription();

    // Set up daily check for auto-deletion of lending records at 2 AM
    const checkDeletion = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 2 && now.getMinutes() === 0) {
        checkAutoDeleteLendingRecords();
      }
    }, 60000); // Check every minute

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(checkDeletion);
    };
  }, []);

  // Handle cylinder actions (ADD/REMOVE/MOVE_TO_EMPTY)
  const handleCylinderAction = async () => {
    const quantity = parseInt(cylinderQuantity);
    if (!quantity || quantity <= 0) {
      Alert.alert("Error", "Please enter a valid quantity");
      return;
    }

    try {
      if (cylinderAction === "ADD") {
        // Add cylinders using bulk operation
        await addMultipleCylinders({
          type: cylinderType,
          status: cylinderStatus,
          lastUpdated: new Date(),
        }, quantity);
        
        Alert.alert("Success", `${quantity} ${cylinderType} cylinders (${cylinderStatus}) added to inventory!`);
      } else if (cylinderAction === "REMOVE") {
        // Remove cylinders using user-isolated function
        try {
          await removeCylinders(cylinderType, cylinderStatus, quantity);
          Alert.alert("Success", `${quantity} ${cylinderType} cylinders (${cylinderStatus}) removed from inventory!`);
        } catch (error) {
          if (error.message.includes('insufficient')) {
            Alert.alert("Error", `Not enough ${cylinderType} cylinders (${cylinderStatus}) available to remove ${quantity}.`);
          } else {
            throw error;
          }
        }
      } else if (cylinderAction === "MOVE_TO_EMPTY") {
        // Move Full cylinders to Empty status
        try {
          const cylinders = await getCylinders();
          const fullCylinders = cylinders.filter(cylinder => 
            cylinder.type === cylinderType && cylinder.status === "FULL"
          );
          
          if (fullCylinders.length < quantity) {
            Alert.alert("Error", `Only ${fullCylinders.length} full ${cylinderType} cylinders available. Cannot move ${quantity} to empty.`);
            return;
          }
          
          // Update the required number of cylinders to EMPTY status
          const updatePromises = [];
          for (let i = 0; i < quantity; i++) {
            updatePromises.push(
              updateCylinder(fullCylinders[i].id, {
                status: "EMPTY",
                lastUpdated: new Date()
              })
            );
          }
          
          await Promise.all(updatePromises);
          Alert.alert("Success", `${quantity} ${cylinderType} cylinders moved from Full to Empty!`);
        } catch (error) {
          Alert.alert("Error", `Failed to move cylinders to empty: ${error.message}`);
        }
      }
      
      setCylinderQuantity("1");
      setCylinderModalVisible(false);
    } catch (error) {
      Alert.alert("Error", `Failed to ${cylinderAction.toLowerCase().replace('_', ' ')} cylinders: ` + error.message);
    }
  };

  // Handle stove actions
  const handleStoveAction = async () => {
    if (stoveAction === "ADD") {
      try {
        await addStove({
          model: stoveModel,
          status: "AVAILABLE",
          addedAt: new Date(),
        });
        Alert.alert("Success", "Stove added to inventory!");
        setStoveModalVisible(false);
      } catch (error) {
        Alert.alert("Error", "Failed to add stove: " + error.message);
      }
    } else if (stoveAction === "LEND") {
      if (!selectedCustomer) {
        Alert.alert("Error", "Please select a customer");
        return;
      }

      if (availableStoves.length === 0) {
        Alert.alert("Error", "No stoves available for lending");
        return;
      }

      try {
        // Find a stove of the selected model
        const stoveToLend = availableStoves.find(stove => stove.model === stoveModel);
        
        if (!stoveToLend) {
          Alert.alert("Error", `No ${stoveModel} available for lending`);
          return;
        }

        // Update stove status to LENT using dataService
        await updateStove(stoveToLend.id, {
          status: "LENT",
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          customerPhone: selectedCustomer.phone,
          customerAddress: selectedCustomer.address,
          paymentStatus: paymentStatus,
          lentAt: new Date(),
        });

        Alert.alert("Success", `${stoveModel} lent to ${selectedCustomer.name || "Unknown Customer"}`);
        setSelectedCustomer(null);
        setStoveModalVisible(false);
      } catch (error) {
        Alert.alert("Error", "Failed to lend stove: " + error.message);
      }
    } else if (stoveAction === "REMOVE") {
      try {
        // Find available stoves of the selected model
        const stovesToRemove = availableStoves.filter(stove => stove.model === stoveModel);
        
        if (stovesToRemove.length === 0) {
          Alert.alert("Error", `No ${stoveModel} available to remove`);
          return;
        }

        // Remove the first available stove of this model using dataService
        await deleteStove(stovesToRemove[0].id);
        
        Alert.alert("Success", `${stoveModel} removed from inventory!`);
        setStoveModalVisible(false);
      } catch (error) {
        Alert.alert("Error", "Failed to remove stove: " + error.message);
      }
    }
  };

  // Function to fetch detailed data for a specific inventory type
  const fetchDetailedData = async (type, status = null) => {
    try {
      let resultData = [];
      let title = '';
      
      if (type === 'fullCylinders') {
        const cylinders = await getCylinders();
        resultData = cylinders.filter(cylinder => cylinder.status === "FULL");
        title = 'Full Cylinders Summary';
      } else if (type === 'emptyCylinders') {
        const cylinders = await getCylinders();
        resultData = cylinders.filter(cylinder => cylinder.status === "EMPTY");
        title = 'Empty Cylinders Summary';
      } else if (type === 'availableStoves') {
        const stoves = await getStoves();
        resultData = stoves.filter(stove => stove.status === "AVAILABLE");
        title = 'Available Stoves Summary';
      } else if (type === 'lentStoves') {
        // For lent stoves, we'll show detailed customer information
        setDetailData(lentStovesDetails);
        setDetailTitle('Rented Stoves Details');
        setDetailType(type);
        setDetailModalVisible(true);
        return;
      }

      // Group data by type/model and count quantities
      const summary = {};
      resultData.forEach(item => {
        const key = item.type || item.model || 'Unknown';
        summary[key] = (summary[key] || 0) + 1;
      });

      setDetailData(summary);
      setDetailTitle(title);
      setDetailType(type);
      setDetailModalVisible(true);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch detailed data: " + error.message);
    }
  };

  // Function to fetch lending history
  const fetchLendingHistory = async () => {
    try {
      const lendingRecords = await getLendingRecords();
      
      // Get customers list for address lookup if needed
      const customers = await getCustomers();
      
      const records = lendingRecords.map(record => {
        // Try to get address from record first, then from customer lookup
        let customerAddress = record.customerAddress;
        if (!customerAddress || customerAddress === 'N/A') {
          const customer = customers.find(c => c.id === record.customerId);
          customerAddress = customer?.address || 'N/A';
        }
        
        return {
          id: record.id,
          ...record,
          customerDetails: { 
            name: record.customerName || 'Unknown Customer', 
            phone: record.customerPhone || 'N/A', 
            address: customerAddress
          }
        };
      });

      // Sort by return date (most recent first)
      records.sort((a, b) => {
        const dateA = a.returnedAt?.toDate ? a.returnedAt.toDate() : new Date(a.returnedAt);
        const dateB = b.returnedAt?.toDate ? b.returnedAt.toDate() : new Date(b.returnedAt);
        return dateB - dateA;
      });

      setLendingHistory(records);
      setLendingHistoryVisible(true);
    } catch (error) {
      console.error("Error fetching lending history:", error);
      Alert.alert("Error", "Failed to fetch lending history: " + error.message);
    }
  };

  // Function to highlight search matches
  const highlightMatch = (text, query) => {
    if (!query || !text) return text;
    
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? 
        `**${part}**` : part
    ).join('');
  };

  // Function to handle customer search
  const handleCustomerSearch = (query) => {
    setCustomerSearchQuery(query);
    if (query.trim() === "") {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer => 
        (customer.name && customer.name.toLowerCase().includes(query.toLowerCase())) ||
        (customer.phone && customer.phone.toLowerCase().includes(query.toLowerCase())) ||
        (customer.address && customer.address.toLowerCase().includes(query.toLowerCase())) ||
        (customer.bookId && customer.bookId.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredCustomers(filtered);
    }
  };

  // Function to handle customer selection and reset search
  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerPicker(false);
    setCustomerSearchQuery("");
    setFilteredCustomers(customers);
  };

  // Function to handle stove return
  const handleStoveReturn = async (stoveId) => {
    try {
      // Get the current stove data to create lending record
      const stoves = await getStoves();
      const stoveData = stoves.find(stove => stove.id === stoveId);

      if (!stoveData) {
        Alert.alert("Error", "Stove not found");
        return;
      }

      // Get customer details with fallback logic
      let customerName = stoveData.customerName;
      let customerPhone = stoveData.customerPhone;
      let customerAddress = stoveData.customerAddress;
      
      // If customer details are not stored on stove, try to get from customers list
      if (!customerName || !customerPhone || !customerAddress) {
        const customers = await getCustomers();
        const customer = customers.find(c => c.id === stoveData.customerId);
        customerName = customerName || customer?.name || "Unknown Customer";
        customerPhone = customerPhone || customer?.phone || "N/A";
        customerAddress = customerAddress || customer?.address || "N/A";
      }

      // Validate required fields before creating lending record
      if (!customerName || customerName === 'undefined') {
        customerName = "Unknown Customer";
      }
      if (!customerPhone || customerPhone === 'undefined') {
        customerPhone = "N/A";
      }
      if (!customerAddress || customerAddress === 'undefined') {
        customerAddress = "N/A";
      }

      // Create a lending record for tracking using dataService
      await addLendingRecord({
        stoveId: stoveId,
        stoveModel: stoveData.model || "Unknown Model",
        customerId: stoveData.customerId || null,
        customerName: customerName,
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        paymentStatus: stoveData.paymentStatus || "UNKNOWN",
        lentAt: stoveData.lentAt || new Date(),
        returnedAt: new Date(),
        status: "RETURNED"
      });

      // Update stove to be available again (physical inventory) using dataService
      await updateStove(stoveId, {
        status: "AVAILABLE",
        customerId: null,
        customerName: null,
        customerPhone: null,
        customerAddress: null,
        paymentStatus: null,
        lentAt: null,
      });

      Alert.alert("Success", "Stove returned successfully! Lending record created for tracking.");
      fetchInventory(); // Refresh the data
    } catch (error) {
      console.error("Error returning stove:", error);
      Alert.alert("Error", "Failed to return stove: " + error.message);
    }
  };

  // Function to handle card clicks
  const handleCardClick = (cardType) => {
    fetchDetailedData(cardType);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.header}>Shubh Labh 🕉</Text>

        {/* Inventory Summary Cards */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Current Stock</Text>
          
          <View style={styles.cardRow}>
            <TouchableOpacity 
              style={[styles.card, styles.cardHalf]}
              onPress={() => handleCardClick('fullCylinders')}
              activeOpacity={0.7}
            >
              <Text style={styles.cardTitle}>Full Cylinders</Text>
              <Text style={[styles.cardValue, styles.successValue]}>{counts.fullCylinders}</Text>
              <Text style={styles.tapHint}>👆 Tap for details</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.card, styles.cardHalf]}
              onPress={() => handleCardClick('emptyCylinders')}
              activeOpacity={0.7}
            >
              <Text style={styles.cardTitle}>Empty Cylinders</Text>
              <Text style={[styles.cardValue, styles.warningValue]}>{counts.emptyCylinders}</Text>
              <Text style={styles.tapHint}>👆 Tap for details</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardRow}>
            <TouchableOpacity 
              style={[styles.card, styles.cardHalf]}
              onPress={() => handleCardClick('availableStoves')}
              activeOpacity={0.7}
            >
              <Text style={styles.cardTitle}>Stoves Available</Text>
              <Text style={[styles.cardValue, styles.successValue]}>{counts.availableStoves}</Text>
              <Text style={styles.tapHint}>👆 Tap for details</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.card, styles.cardHalf]}
              onPress={() => handleCardClick('lentStoves')}
              activeOpacity={0.7}
            >
              <Text style={styles.cardTitle}>Stoves Rented</Text>
              <Text style={[styles.cardValue, styles.infoValue]}>{counts.lentStoves}</Text>
              <Text style={styles.tapHint}>👆 Tap for details</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => {
              setCylinderAction("ADD");
              setCylinderModalVisible(true);
            }}
          >
            <Text style={styles.actionButtonText}>🔄 Manage Cylinders</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => {
              setStoveAction("ADD");
              setStoveModalVisible(true);
            }}
          >
            <Text style={styles.actionButtonText}>🔥 Manage Stoves</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.historyButton]}
            onPress={fetchLendingHistory}
          >
            <Text style={styles.actionButtonText}>📊 View Renting History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Cylinder Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={cylinderModalVisible}
        onRequestClose={() => setCylinderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Cylinders</Text>
              <TouchableOpacity onPress={() => setCylinderModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              {cylinderAction === "MOVE_TO_EMPTY" && (
                <View style={styles.actionDescription}>
                  <Text style={styles.actionDescriptionText}>
                    💡 This will change Full cylinders to Empty status (e.g., when cylinders are sold/delivered)
                  </Text>
                </View>
              )}
              
              <Text style={styles.inputLabel}>Action:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={cylinderAction}
                  onValueChange={setCylinderAction}
                  style={styles.picker}
                >
                  <Picker.Item label="Add to Inventory" value="ADD" />
                  <Picker.Item label="Remove from Inventory" value="REMOVE" />
                  <Picker.Item label="Move to Empty" value="MOVE_TO_EMPTY" />
                </Picker>
              </View>

              <Text style={styles.inputLabel}>Cylinder Type:</Text>
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

              {cylinderAction !== "MOVE_TO_EMPTY" && (
                <>
                  <Text style={styles.inputLabel}>Status:</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={cylinderStatus}
                      onValueChange={setCylinderStatus}
                      style={styles.picker}
                    >
                      <Picker.Item label="FULL" value="FULL" />
                      <Picker.Item label="EMPTY" value="EMPTY" />
                    </Picker>
                  </View>
                </>
              )}

              <Text style={styles.inputLabel}>Quantity:</Text>
              <TextInput
                placeholder="Enter quantity..."
                value={cylinderQuantity}
                onChangeText={setCylinderQuantity}
                keyboardType="numeric"
                style={styles.textInput}
              />

              {cylinderAction === "REMOVE" && (
                <Text style={styles.helperText}>
                  Available {cylinderType} ({cylinderStatus}): {cylinderCounts[cylinderType]?.[cylinderStatus] || 0}
                </Text>
              )}
              
              {cylinderAction === "MOVE_TO_EMPTY" && (
                <Text style={styles.helperText}>
                  Available Full {cylinderType} cylinders: {cylinderCounts[cylinderType]?.["FULL"] || 0}
                </Text>
              )}

              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setCylinderModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleCylinderAction}
                >
                  <Text style={styles.confirmButtonText}>
                    {cylinderAction === "ADD" ? "Add to Inventory" : 
                     cylinderAction === "REMOVE" ? "Remove" : 
                     "Move to Empty"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Stove Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={stoveModalVisible}
        onRequestClose={() => setStoveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Stoves</Text>
              <TouchableOpacity onPress={() => setStoveModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Action:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={stoveAction}
                  onValueChange={setStoveAction}
                  style={styles.picker}
                >
                  <Picker.Item label="Add New Stove" value="ADD" />
                  <Picker.Item label="Rent to Customer" value="LEND" />
                  <Picker.Item label="Remove from Inventory" value="REMOVE" />
                </Picker>
              </View>

              <Text style={styles.inputLabel}>Stove Model:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={stoveModel}
                  onValueChange={setStoveModel}
                  style={styles.picker}
                >
                  <Picker.Item label="Single Burner" value="Single Burner" />
                  <Picker.Item label="Standard 2-Burner" value="Standard 2-Burner" />
                </Picker>
              </View>

              {stoveAction === "LEND" && (
                <View>
                  <Text style={styles.inputLabel}>Payment Status:</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={paymentStatus}
                      onValueChange={setPaymentStatus}
                      style={styles.picker}
                    >
                      <Picker.Item label="✅ Paid" value="PAID" />
                      <Picker.Item label="⏳ Pending" value="PENDING" />
                    </Picker>
                  </View>

                  <Text style={styles.inputLabel}>Select Customer:</Text>
                  <TouchableOpacity 
                    style={styles.customerSelector}
                    onPress={() => setShowCustomerPicker(true)}
                  >
                    <View style={styles.customerSelectorContent}>
                      <Text style={styles.searchIcon}>🔍</Text>
                      <Text style={[styles.customerSelectorText, !selectedCustomer && styles.placeholderText]}>
                        {selectedCustomer ? `${selectedCustomer.name || "Unknown"} (${selectedCustomer.phone || "N/A"})` : "Search and select customer"}
                      </Text>
                    </View>
                    <Text style={styles.selectorArrow}>▼</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.helperText}>
                    Available {stoveModel}: {availableStoves.filter(s => s.model === stoveModel).length}
                  </Text>
                </View>
              )}

              {stoveAction === "REMOVE" && (
                <Text style={styles.helperText}>
                  Available {stoveModel}: {availableStoves.filter(s => s.model === stoveModel).length}
                </Text>
              )}

              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setStoveModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleStoveAction}
                >
                  <Text style={styles.confirmButtonText}>
                    {stoveAction === "ADD" ? "Add Stove" : stoveAction === "LEND" ? "Rent Stove" : "Remove Stove"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{detailTitle}</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {detailType === 'lentStoves' ? (
                // Special view for lent stoves with customer details
                detailData.length === 0 ? (
                  <Text style={styles.noDataText}>No stoves currently Rent</Text>
                ) : (
                  detailData.map((stove, index) => (
                    <View key={stove.id} style={styles.lentStoveItem}>
                      <View style={styles.stoveHeader}>
                        <Text style={styles.stoveModel}>{stove.model}</Text>
                        <Text style={[styles.paymentBadge, stove.paymentStatus === 'PAID' ? styles.paidBadge : styles.pendingBadge]}>
                          {stove.paymentStatus === 'PAID' ? '✅ PAID' : '⏳ PENDING'}
                        </Text>
                      </View>
                      
                      <View style={styles.customerInfo}>
                        <Text style={styles.customerName}>👤 {stove.customerDetails.name}</Text>
                        <Text style={styles.customerDetail}>📞 {stove.customerDetails.phone}</Text>
                        {stove.customerDetails.address && stove.customerDetails.address !== 'N/A' && (
                          <Text style={styles.customerDetail}>📍 {stove.customerDetails.address}</Text>
                        )}
                      </View>
                      
                      <View style={styles.stoveFooter}>
                        <Text style={styles.lentDate}>
                          Lent: {stove.lentAt ? new Date(stove.lentAt.toDate ? stove.lentAt.toDate() : stove.lentAt).toLocaleDateString() : 'Unknown'}
                        </Text>
                        <TouchableOpacity 
                          style={styles.returnButton}
                          onPress={() => {
                            Alert.alert(
                              "Return Stove",
                              `Mark ${stove.model} as returned from ${stove.customerDetails.name}?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                { text: "Return", onPress: () => handleStoveReturn(stove.id) }
                              ]
                            );
                          }}
                        >
                          <Text style={styles.returnButtonText}>Return</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )
              ) : (
                // Standard grouped view for other inventory types
                Object.keys(detailData).length === 0 ? (
                  <Text style={styles.noDataText}>No data available</Text>
                ) : (
                  Object.entries(detailData).map(([type, quantity]) => (
                    <View key={type} style={styles.detailItem}>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryType}>{type}</Text>
                        <Text style={styles.summaryQuantity}>Qty: {quantity}</Text>
                      </View>
                    </View>
                  ))
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Customer Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCustomerPicker}
        onRequestClose={() => {
          setShowCustomerPicker(false);
          setCustomerSearchQuery("");
          setFilteredCustomers(customers);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity onPress={() => {
                setShowCustomerPicker(false);
                setCustomerSearchQuery("");
                setFilteredCustomers(customers);
              }}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              {/* Search Input */}
              <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, phone, address, or book ID..."
                  value={customerSearchQuery}
                  onChangeText={handleCustomerSearch}
                  autoFocus={true}
                />
                {customerSearchQuery.length > 0 && (
                  <TouchableOpacity 
                    style={styles.clearButton}
                    onPress={() => handleCustomerSearch("")}
                  >
                    <Text style={styles.clearButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Search Results Count */}
              {customerSearchQuery.length > 0 && (
                <Text style={styles.searchResults}>
                  Found {filteredCustomers.length} customer(s)
                </Text>
              )}

              {/* Customer List */}
              <ScrollView style={styles.customerScrollView}>
                {filteredCustomers.length === 0 ? (
                  <Text style={styles.noDataText}>
                    {customerSearchQuery.length > 0 ? "No customers match your search" : "No customers found"}
                  </Text>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TouchableOpacity
                      key={customer.id}
                      style={styles.customerItem}
                      onPress={() => selectCustomer(customer)}
                    >
                      <View style={styles.customerItemHeader}>
                        <Text style={styles.customerItemName}>{customer.name || "Unknown Customer"}</Text>
                        {customer.bookId && (
                          <Text style={styles.bookIdBadge}>ID: {customer.bookId}</Text>
                        )}
                      </View>
                      <Text style={styles.customerItemPhone}>📞 {customer.phone || "N/A"}</Text>
                      {customer.address && (
                        <Text style={styles.customerItemAddress}>📍 {customer.address}</Text>
                      )}
                      {customer.category && (
                        <Text style={styles.customerCategory}>🏷️ {customer.category}</Text>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lending History Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={lendingHistoryVisible}
        onRequestClose={() => setLendingHistoryVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📊 Stove Renting History</Text>
              <TouchableOpacity onPress={() => setLendingHistoryVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {lendingHistory.length === 0 ? (
                <Text style={styles.noDataText}>No Renting history found</Text>
              ) : (
                <View>
                  <Text style={styles.historyCount}>
                    Total Records: {lendingHistory.length}
                  </Text>
                  {lendingHistory.map((record, index) => (
                    <View key={record.id} style={styles.historyItem}>
                      <View style={styles.historyHeader}>
                        <Text style={styles.historyStoveModel}>{record.stoveModel}</Text>
                        <Text style={[styles.historyPaymentBadge, record.paymentStatus === 'PAID' ? styles.paidBadge : styles.pendingBadge]}>
                          {record.paymentStatus === 'PAID' ? '✅ PAID' : '⏳ PENDING'}
                        </Text>
                      </View>
                      
                      <View style={styles.historyCustomerInfo}>
                        <Text style={styles.historyCustomerName}>👤 {record.customerDetails.name}</Text>
                        <Text style={styles.historyCustomerDetail}>📞 {record.customerDetails.phone}</Text>
                        {record.customerDetails.address && record.customerDetails.address !== 'N/A' && (
                          <Text style={styles.historyCustomerDetail}>📍 {record.customerDetails.address}</Text>
                        )}
                      </View>
                      
                      <View style={styles.historyDates}>
                        <View style={styles.historyDateRow}>
                          <Text style={styles.historyDateLabel}>Rent:</Text>
                          <Text style={styles.historyDateValue}>
                            {record.lentAt ? new Date(record.lentAt.toDate ? record.lentAt.toDate() : record.lentAt).toLocaleDateString() : 'Unknown'}
                          </Text>
                        </View>
                        <View style={styles.historyDateRow}>
                          <Text style={styles.historyDateLabel}>Returned:</Text>
                          <Text style={styles.historyDateValue}>
                            {record.returnedAt ? new Date(record.returnedAt.toDate ? record.returnedAt.toDate() : record.returnedAt).toLocaleDateString() : 'Unknown'}
                          </Text>
                        </View>
                        <View style={styles.historyDateRow}>
                          <Text style={styles.historyDateLabel}>Duration:</Text>
                          <Text style={styles.historyDurationValue}>
                            {record.lentAt && record.returnedAt ? 
                              (() => {
                                const lentDate = record.lentAt.toDate ? record.lentAt.toDate() : new Date(record.lentAt);
                                const returnDate = record.returnedAt.toDate ? record.returnedAt.toDate() : new Date(record.returnedAt);
                                const days = Math.ceil((returnDate - lentDate) / (1000 * 60 * 60 * 24));
                                return `${days} day${days !== 1 ? 's' : ''}`;
                              })()
                              : 'Unknown'
                            }
                          </Text>
                        </View>
                      </View>

                      {/* Auto-deletion countdown */}
                      {record.returnedAt && (
                        <View style={styles.deletionInfo}>
                          <Text style={styles.deletionText}>
                            {(() => {
                              const returnDate = record.returnedAt.toDate ? record.returnedAt.toDate() : new Date(record.returnedAt);
                              const daysSinceReturn = Math.floor((new Date() - returnDate) / (1000 * 60 * 60 * 24));
                              const daysLeft = 28 - daysSinceReturn;
                              
                              if (daysLeft > 0) {
                                return `🗑️ Auto-delete in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
                              } else {
                                return `🗑️ Scheduled for deletion`;
                              }
                            })()}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: colors.text,
  },
  summarySection: {
    marginBottom: 30,
  },
  actionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: colors.text,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHalf: {
    flex: 0.48,
    marginBottom: 0,
  },
  cardTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
    color: colors.text,
  },
  successValue: {
    color: colors.success,
  },
  warningValue: {
    color: colors.warning,
  },
  infoValue: {
    color: colors.primary,
  },
  actionButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.success,
  },
  historyButton: {
    backgroundColor: '#6f42c1',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    fontSize: 20,
    color: colors.textSecondary,
    paddingHorizontal: 10,
  },
  modalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 15,
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
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Detail modal styles
  tapHint: {
    fontSize: 10,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 5,
  },
  noDataText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 16,
    fontStyle: 'italic',
    padding: 20,
  },
  detailItem: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryType: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  summaryQuantity: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
  },
  // Customer selector styles
  customerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.inputBackground,
    marginBottom: 15,
  },
  customerSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerSelectorText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    marginLeft: 8,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  selectorArrow: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Customer picker modal styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.inputBackground,
    marginBottom: 15,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: colors.textSecondary,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: colors.text,
  },
  clearButton: {
    padding: 5,
  },
  clearButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  searchResults: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 10,
    textAlign: 'center',
  },
  customerScrollView: {
    maxHeight: 400,
  },
  customerItem: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customerItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  customerItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  bookIdBadge: {
    backgroundColor: colors.surface,
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  customerItemPhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  customerItemAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  customerCategory: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  // Lent stoves detail styles
  lentStoveItem: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  stoveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stoveModel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  paidBadge: {
    backgroundColor: colors.success + '20',
    color: colors.success,
  },
  pendingBadge: {
    backgroundColor: colors.warning + '20',
    color: colors.warning,
  },
  customerInfo: {
    marginBottom: 10,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  customerDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  stoveFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  lentDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  returnButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  returnButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Lending history styles
  historyCount: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '600',
  },
  historyItem: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#6f42c1',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyStoveModel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  historyPaymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyCustomerInfo: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyCustomerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  historyCustomerDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  historyDates: {
    marginBottom: 10,
  },
  historyDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyDateLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  historyDateValue: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'right',
  },
  historyDurationValue: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  // Action description styles
  actionDescription: {
    backgroundColor: colors.primary + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  actionDescriptionText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    lineHeight: 20,
  },
  deletionInfo: {
    backgroundColor: colors.warning + '20',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  deletionText: {
    fontSize: 11,
    color: colors.warning,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});