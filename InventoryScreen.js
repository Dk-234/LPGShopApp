import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, FlatList } from 'react-native';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';
import { db } from './firebaseConfig';

export default function InventoryScreen() {
  const [counts, setCounts] = useState({
    fullCylinders: 0,
    emptyCylinders: 0,
    availableStoves: 0,
    lentStoves: 0,
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
  const [cylinderType, setCylinderType] = useState("14.2kg");
  const [cylinderStatus, setCylinderStatus] = useState("FULL");
  const [cylinderQuantity, setCylinderQuantity] = useState("1");

  // Stove form states
  const [stoveAction, setStoveAction] = useState("ADD"); // ADD or LEND
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
      // Cylinders
      const fullCylindersQuery = query(collection(db, "cylinders"), where("status", "==", "FULL"));
      const emptyCylindersQuery = query(collection(db, "cylinders"), where("status", "==", "EMPTY"));
      
      // Stoves
      const availableStovesQuery = query(collection(db, "stoves"), where("status", "==", "AVAILABLE"));
      const lentStovesQuery = query(collection(db, "stoves"), where("status", "==", "LENT"));

      // Customers
      const customersQuery = query(collection(db, "customers"));

      const [fullSnap, emptySnap, availableSnap, lentSnap, customersSnap] = await Promise.all([
        getDocs(fullCylindersQuery),
        getDocs(emptyCylindersQuery),
        getDocs(availableStovesQuery),
        getDocs(lentStovesQuery),
        getDocs(customersQuery),
      ]);

      setCounts({
        fullCylinders: fullSnap.size,
        emptyCylinders: emptySnap.size,
        availableStoves: availableSnap.size,
        lentStoves: lentSnap.size,
      });

      // Store available stoves for lending
      const stoves = [];
      availableSnap.forEach((doc) => stoves.push({ id: doc.id, ...doc.data() }));
      setAvailableStoves(stoves);

      // Store customers for selection
      const customersList = [];
      customersSnap.forEach((doc) => customersList.push({ id: doc.id, ...doc.data() }));
      setCustomers(customersList);
      setFilteredCustomers(customersList); // Initialize filtered list

      // Store lent stoves with customer details
      const lentStoves = [];
      lentSnap.forEach((doc) => {
        const stoveData = doc.data();
        const customer = customersList.find(c => c.id === stoveData.customerId);
        lentStoves.push({ 
          id: doc.id, 
          ...stoveData,
          customerDetails: customer || { name: 'Unknown Customer', phone: 'N/A', address: 'N/A' }
        });
      });
      setLentStovesDetails(lentStoves);

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
      const returnedRecordsQuery = query(collection(db, "lendingRecords"), where("status", "==", "RETURNED"));
      const snapshot = await getDocs(returnedRecordsQuery);
      
      const now = new Date();
      const deletionPromises = [];

      snapshot.forEach((doc) => {
        const record = doc.data();
        if (record.returnedAt) {
          const returnDate = record.returnedAt.toDate ? record.returnedAt.toDate() : new Date(record.returnedAt);
          const daysSinceReturn = (now - returnDate) / (1000 * 60 * 60 * 24);
          
          if (daysSinceReturn >= 28) {
            console.log(`Auto-deleting lending record ${doc.id} after 28 days`);
            deletionPromises.push(deleteDoc(doc(db, "lendingRecords", doc.id)));
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
    const unsubscribes = [
      // Cylinders
      onSnapshot(query(collection(db, "cylinders"), where("status", "==", "FULL")), () => fetchInventory()),
      onSnapshot(query(collection(db, "cylinders"), where("status", "==", "EMPTY")), () => fetchInventory()),
      // Stoves
      onSnapshot(query(collection(db, "stoves"), where("status", "==", "AVAILABLE")), () => fetchInventory()),
      onSnapshot(query(collection(db, "stoves"), where("status", "==", "LENT")), () => fetchInventory()),
      // Customers
      onSnapshot(query(collection(db, "customers")), () => fetchInventory()),
    ];

    // Set up daily check for auto-deletion of lending records at 2 AM
    const checkDeletion = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 2 && now.getMinutes() === 0) {
        checkAutoDeleteLendingRecords();
      }
    }, 60000); // Check every minute

    return () => {
      unsubscribes.forEach(unsub => unsub());
      clearInterval(checkDeletion);
    };
  }, []);

  // Handle cylinder addition
  const handleAddCylinders = async () => {
    const quantity = parseInt(cylinderQuantity);
    if (!quantity || quantity <= 0) {
      Alert.alert("Error", "Please enter a valid quantity");
      return;
    }

    try {
      for (let i = 0; i < quantity; i++) {
        await addDoc(collection(db, "cylinders"), {
          type: cylinderType,
          status: cylinderStatus,
          lastUpdated: new Date(),
        });
      }
      Alert.alert("Success", `${quantity} ${cylinderType} cylinders (${cylinderStatus}) added to inventory!`);
      setCylinderQuantity("1");
      setCylinderModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to add cylinders: " + error.message);
    }
  };

  // Handle stove actions
  const handleStoveAction = async () => {
    if (stoveAction === "ADD") {
      try {
        await addDoc(collection(db, "stoves"), {
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

        // Update stove status to LENT
        await updateDoc(doc(db, "stoves", stoveToLend.id), {
          status: "LENT",
          customerId: selectedCustomer.id,
          paymentStatus: paymentStatus,
          lentAt: new Date(),
        });

        Alert.alert("Success", `${stoveModel} lent to ${selectedCustomer.name}`);
        setSelectedCustomer(null);
        setStoveModalVisible(false);
      } catch (error) {
        Alert.alert("Error", "Failed to lend stove: " + error.message);
      }
    }
  };

  // Function to fetch detailed data for a specific inventory type
  const fetchDetailedData = async (type, status = null) => {
    try {
      let queryRef;
      let title = '';
      
      if (type === 'fullCylinders') {
        queryRef = query(collection(db, "cylinders"), where("status", "==", "FULL"));
        title = 'Full Cylinders Summary';
      } else if (type === 'emptyCylinders') {
        queryRef = query(collection(db, "cylinders"), where("status", "==", "EMPTY"));
        title = 'Empty Cylinders Summary';
      } else if (type === 'availableStoves') {
        queryRef = query(collection(db, "stoves"), where("status", "==", "AVAILABLE"));
        title = 'Available Stoves Summary';
      } else if (type === 'lentStoves') {
        // For lent stoves, we'll show detailed customer information
        setDetailData(lentStovesDetails);
        setDetailTitle('Lent Stoves Details');
        setDetailType(type);
        setDetailModalVisible(true);
        return;
      }

      const snapshot = await getDocs(queryRef);
      const data = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });

      // Group data by type/model and count quantities
      const summary = {};
      data.forEach(item => {
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
      const lendingRecordsQuery = query(collection(db, "lendingRecords"));
      const snapshot = await getDocs(lendingRecordsQuery);
      
      const records = [];
      snapshot.forEach((doc) => {
        const recordData = doc.data();
        // Find customer details for each record
        const customer = customers.find(c => c.id === recordData.customerId);
        records.push({
          id: doc.id,
          ...recordData,
          customerDetails: customer || { name: 'Unknown Customer', phone: 'N/A', address: 'N/A' }
        });
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
        customer.name.toLowerCase().includes(query.toLowerCase()) ||
        customer.phone.toLowerCase().includes(query.toLowerCase()) ||
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
      const stoveDoc = await getDocs(query(collection(db, "stoves"), where("__name__", "==", stoveId)));
      let stoveData = null;
      stoveDoc.forEach(doc => {
        stoveData = { id: doc.id, ...doc.data() };
      });

      if (!stoveData) {
        Alert.alert("Error", "Stove not found");
        return;
      }

      // Create a lending record for tracking
      await addDoc(collection(db, "lendingRecords"), {
        stoveId: stoveId,
        stoveModel: stoveData.model,
        customerId: stoveData.customerId,
        paymentStatus: stoveData.paymentStatus,
        lentAt: stoveData.lentAt,
        returnedAt: new Date(),
        status: "RETURNED"
      });

      // Update stove to be available again (physical inventory)
      await updateDoc(doc(db, "stoves", stoveId), {
        status: "AVAILABLE",
        customerId: null,
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
        <Text style={styles.header}>Inventory Management</Text>

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
              <Text style={styles.cardTitle}>Stoves Lent</Text>
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
            onPress={() => setCylinderModalVisible(true)}
          >
            <Text style={styles.actionButtonText}>🔥 Update Cylinders</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => setStoveModalVisible(true)}
          >
            <Text style={styles.actionButtonText}>🍳 Manage Stoves</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.historyButton]}
            onPress={fetchLendingHistory}
          >
            <Text style={styles.actionButtonText}>📊 View Lending History</Text>
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
              <Text style={styles.modalTitle}>Update Cylinder Stock</Text>
              <TouchableOpacity onPress={() => setCylinderModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
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

              <Text style={styles.inputLabel}>Quantity:</Text>
              <TextInput
                placeholder="Enter quantity..."
                value={cylinderQuantity}
                onChangeText={setCylinderQuantity}
                keyboardType="numeric"
                style={styles.textInput}
              />

              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setCylinderModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleAddCylinders}
                >
                  <Text style={styles.confirmButtonText}>Add to Inventory</Text>
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
                  <Picker.Item label="Lend to Customer" value="LEND" />
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
                        {selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone})` : "Search and select customer"}
                      </Text>
                    </View>
                    <Text style={styles.selectorArrow}>▼</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.helperText}>
                    Available {stoveModel}: {availableStoves.filter(s => s.model === stoveModel).length}
                  </Text>
                </View>
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
                    {stoveAction === "ADD" ? "Add Stove" : "Lend Stove"}
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
                  <Text style={styles.noDataText}>No stoves currently lent</Text>
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
                        {stove.customerDetails.address && (
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
                        <Text style={styles.customerItemName}>{customer.name}</Text>
                        {customer.bookId && (
                          <Text style={styles.bookIdBadge}>ID: {customer.bookId}</Text>
                        )}
                      </View>
                      <Text style={styles.customerItemPhone}>📞 {customer.phone}</Text>
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
              <Text style={styles.modalTitle}>📊 Stove Lending History</Text>
              <TouchableOpacity onPress={() => setLendingHistoryVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {lendingHistory.length === 0 ? (
                <Text style={styles.noDataText}>No lending history found</Text>
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
                        {record.customerDetails.address && (
                          <Text style={styles.historyCustomerDetail}>📍 {record.customerDetails.address}</Text>
                        )}
                      </View>
                      
                      <View style={styles.historyDates}>
                        <View style={styles.historyDateRow}>
                          <Text style={styles.historyDateLabel}>Lent:</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
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
    color: '#333',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  card: {
    backgroundColor: 'white',
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
    color: '#666',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  successValue: {
    color: '#28a745',
  },
  warningValue: {
    color: '#ffc107',
  },
  infoValue: {
    color: '#007bff',
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
    backgroundColor: '#007bff',
  },
  secondaryButton: {
    backgroundColor: '#28a745',
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
    backgroundColor: 'white',
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
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 20,
    color: '#666',
    paddingHorizontal: 10,
  },
  modalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: {
    backgroundColor: '#007bff',
  },
  cancelButtonText: {
    color: '#666',
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
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 5,
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    fontStyle: 'italic',
    padding: 20,
  },
  detailItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#007bff',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryType: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },
  summaryQuantity: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: 'bold',
    backgroundColor: '#e3f2fd',
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
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  customerSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerSelectorText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginLeft: 8,
  },
  placeholderText: {
    color: '#999',
    fontStyle: 'italic',
  },
  selectorArrow: {
    fontSize: 12,
    color: '#666',
  },
  // Customer picker modal styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 15,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#999',
  },
  searchResults: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
    textAlign: 'center',
  },
  customerScrollView: {
    maxHeight: 400,
  },
  customerItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#007bff',
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
    color: '#333',
    flex: 1,
  },
  bookIdBadge: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  customerItemPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  customerItemAddress: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  customerCategory: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
  },
  // Lent stoves detail styles
  lentStoveItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
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
    color: '#333',
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
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  pendingBadge: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  customerInfo: {
    marginBottom: 10,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  customerDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  stoveFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  lentDate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  returnButton: {
    backgroundColor: '#dc3545',
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
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '600',
  },
  historyItem: {
    backgroundColor: '#f8f9fa',
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
    color: '#333',
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
    borderBottomColor: '#dee2e6',
  },
  historyCustomerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  historyCustomerDetail: {
    fontSize: 12,
    color: '#666',
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
    color: '#666',
    fontWeight: '600',
    flex: 1,
  },
  historyDateValue: {
    fontSize: 12,
    color: '#333',
    textAlign: 'right',
  },
  historyDurationValue: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  deletionInfo: {
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  deletionText: {
    fontSize: 11,
    color: '#856404',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});