import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, useColorScheme, Modal, TextInput, Alert } from 'react-native';
import { collection, query, where, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { getCurrentUserPhone } from './auth';

// Color scheme utility for DashboardScreen
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
});

export default function DashboardScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const styles = createStyles(colors);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    unpaidOrders: 0,
    paidOrders: 0,
    partialOrders: 0,
    todayBookings: 0,
    domesticCustomers: 0,
    commercialCustomers: 0,
    subsidyCustomers: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  
  // Price management states
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [prices, setPrices] = useState({
    '14.2kg': 1150,
    '5kg': 450,
    '19kg': 1350
  });
  const [tempPrices, setTempPrices] = useState({...prices});
  const [clickCount, setClickCount] = useState(0);

  const onRefresh = () => {
    setRefreshing(true);
    // Since we're using real-time updates, just set refreshing to false after a short delay
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Secret button handler
  const handleWelcomePress = () => {
    setClickCount(prev => prev + 1);
    setTimeout(() => setClickCount(0), 2000); // Reset after 2 seconds
    
    if (clickCount >= 2) { // 3 clicks total (0-2)
      setPriceModalVisible(true);
      setClickCount(0);
    }
  };

  // Load prices from Firebase
  const loadPrices = async () => {
    try {
      const pricesDoc = await getDoc(doc(db, "settings", "prices"));
      if (pricesDoc.exists()) {
        const loadedPrices = pricesDoc.data();
        setPrices(loadedPrices);
        setTempPrices(loadedPrices);
      }
    } catch (error) {
      console.error("Error loading prices:", error);
    }
  };

  // Save prices to Firebase
  const savePrices = async () => {
    try {
      await setDoc(doc(db, "settings", "prices"), tempPrices);
      setPrices(tempPrices);
      setPriceModalVisible(false);
      Alert.alert("Success", "Prices updated successfully!");
    } catch (error) {
      console.error("Error saving prices:", error);
      Alert.alert("Error", "Failed to update prices");
    }
  };

  useEffect(() => {
    // Load prices on component mount
    loadPrices();
    
    const setupUserAwareListeners = async () => {
      try {
        const userPhone = await getCurrentUserPhone();
        if (!userPhone) {
          console.error('No user phone found');
          return;
        }

        // Fetch customers for current user
        const customersQuery = query(
          collection(db, "customers"),
          where("userPhone", "==", userPhone)
        );
        const customersUnsubscribe = onSnapshot(customersQuery, 
          (snapshot) => {
            const allCustomers = [];
            snapshot.forEach((doc) => {
              allCustomers.push({ id: doc.id, ...doc.data() });
            });
            setCustomers(allCustomers);
          },
          (error) => {
            console.error("Error fetching customers:", error);
          }
        );

        // Fetch bookings for current user
        const bookingsQuery = query(
          collection(db, "bookings"),
          where("userPhone", "==", userPhone)
        );
        const bookingsUnsubscribe = onSnapshot(bookingsQuery, 
          (snapshot) => {
            const allBookings = [];
            snapshot.forEach((doc) => {
              allBookings.push({ id: doc.id, ...doc.data() });
            });
            setBookings(allBookings);
          },
          (error) => {
            console.error("Error fetching bookings:", error);
          }
        );

        return () => {
          customersUnsubscribe();
          bookingsUnsubscribe();
        };
      } catch (error) {
        console.error("Error setting up dashboard listeners:", error);
      }
    };

    setupUserAwareListeners();
  }, []);

  // Update stats whenever customers or bookings change
  useEffect(() => {
    // Only calculate stats if we have data
    if (customers.length === 0 && bookings.length === 0) return;
    
    // Calculate booking payment stats (from bookings, not customers)
    const unpaidOrders = bookings.filter(booking => 
      (booking.payment?.status === 'Pending' || !booking.payment?.status) && 
      booking.status !== 'Delivered'
    );
    const paidOrders = bookings.filter(booking => 
      booking.payment?.status === 'Paid' && 
      booking.status !== 'Delivered'
    );
    const partialOrders = bookings.filter(booking => 
      booking.payment?.status === 'Partial' && 
      booking.status !== 'Delivered'
    );
    
    // Calculate customer category stats
    const domesticCustomers = customers.filter(customer => customer.category === 'Domestic');
    const commercialCustomers = customers.filter(customer => customer.category === 'Commercial');
    const subsidyCustomers = customers.filter(customer => customer.subsidy === true);

    // Calculate today's bookings (including next 24 hours)
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const twentyFourHoursLater = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    
    const todayBookings = bookings.filter(booking => {
      // First, exclude delivered orders
      const isDelivered = booking.status === 'Delivered';
      if (isDelivered) {
        return false; // Don't count delivered orders
      }
      
      const deliveryDate = booking.deliveryDate?.toDate ? booking.deliveryDate.toDate() : new Date(booking.deliveryDate);
      
      // Include ALL non-delivered bookings that are:
      // 1. Past pending deliveries (delivery date was before now)
      // 2. Current pending deliveries (delivery date is today)
      // 3. Future pending deliveries (delivery date is within next 24 hours)
      const isPendingDelivery = deliveryDate <= twentyFourHoursLater;
      
      if (isPendingDelivery) {
        let deliveryStatus = '';
        if (deliveryDate < now) {
          deliveryStatus = 'Overdue delivery';
        } else if (deliveryDate <= twentyFourHoursLater) {
          deliveryStatus = 'Delivery next 24hrs';
        }
        console.log(`📋 Today's booking: ${booking.id}, Status: ${booking.status}, Type: ${deliveryStatus}, Delivery: ${deliveryDate.toLocaleString()}`);
      }
      
      return isPendingDelivery;
    });
    
    //console.log(`📊 Dashboard Stats - Total bookings: ${bookings.length}, Today's bookings (all pending deliveries): ${todayBookings.length}`);
    
    // Log detailed breakdown for debugging
    const deliveredBookings = bookings.filter(booking => booking.status === 'Delivered');
    const overdueDeliveries = bookings.filter(booking => {
      const deliveryDate = booking.deliveryDate?.toDate ? booking.deliveryDate.toDate() : new Date(booking.deliveryDate);
      return deliveryDate < now && booking.status !== 'Delivered';
    }).length;
    const upcomingDeliveries = bookings.filter(booking => {
      const deliveryDate = booking.deliveryDate?.toDate ? booking.deliveryDate.toDate() : new Date(booking.deliveryDate);
      return deliveryDate >= now && deliveryDate <= twentyFourHoursLater && booking.status !== 'Delivered';
    }).length;
    
    // console.log(`📋 Breakdown: Overdue deliveries: ${overdueDeliveries}, Upcoming deliveries (next 24hrs): ${upcomingDeliveries}`);
    // if (deliveredBookings.length > 0) {
    //   console.log(`📦 Delivered orders excluded: ${deliveredBookings.length}`);
    // }

    setStats({
      totalCustomers: customers.length,
      unpaidOrders: unpaidOrders.length,
      paidOrders: paidOrders.length,
      partialOrders: partialOrders.length,
      todayBookings: todayBookings.length,
      domesticCustomers: domesticCustomers.length,
      commercialCustomers: commercialCustomers.length,
      subsidyCustomers: subsidyCustomers.length,
    });
  }, [customers, bookings]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Inventory Button */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={handleWelcomePress} activeOpacity={1}>
          <Text style={styles.header}>Welcome🙏</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.inventoryButton}
          onPress={() => navigation.navigate('InventoryScreen')}
        >
          <Text style={styles.inventoryButtonText}>📦 Inventory</Text>
        </TouchableOpacity>
      </View>
      
      {/* Quick Summary Banner */}
      <View style={styles.summaryBanner}>
        <Text style={styles.summaryTitle}>Quick Overview</Text>
        <Text style={styles.summaryText}>
          📊 {stats.totalCustomers} customers • 
          ❌ {stats.unpaidOrders} unpaid • 
          ✅ {stats.paidOrders} paid • 
          ⌚ {stats.todayBookings} bookings today
        </Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddCustomer')}
        >
          <Text style={styles.actionText}>➕ New Customer</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('CustomersListScreen')}
        >
          <Text style={styles.actionText}>👥 View All</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.card, styles.clickableCard]}
        onPress={() => navigation.navigate('CustomersListScreen')}
        activeOpacity={0.7}
      >
        <Text style={styles.cardTitle}>Total Customers</Text>
        <Text style={styles.cardValue}>{stats.totalCustomers}</Text>
        <Text style={styles.cardAction}>👆 Tap to view all</Text>
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <TouchableOpacity 
          style={[styles.card, styles.halfCard, styles.clickableCard]}
          onPress={() => navigation.navigate('BookingsListScreen', { paymentFilter: 'Pending' })}
          activeOpacity={0.7}
        >
          <Text style={styles.cardTitle}>Unpaid Orders</Text>
          <Text style={[styles.cardValue, { color: 'red' }]}>{stats.unpaidOrders}</Text>
          <Text style={styles.cardAction}>👆 View unpaid</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.card, styles.halfCard, styles.clickableCard]}
          onPress={() => navigation.navigate('BookingsListScreen', { paymentFilter: 'Paid' })}
          activeOpacity={0.7}
        >
          <Text style={styles.cardTitle}>Paid Orders</Text>
          <Text style={[styles.cardValue, { color: 'green' }]}>{stats.paidOrders}</Text>
          <Text style={styles.cardAction}>👆 View paid</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <TouchableOpacity 
          style={[styles.card, styles.halfCard, styles.clickableCard]}
          onPress={() => navigation.navigate('BookingsListScreen', { paymentFilter: 'Partial' })}
          activeOpacity={0.7}
        >
          <Text style={styles.cardTitle}>Partial Payments</Text>
          <Text style={[styles.cardValue, { color: 'orange' }]}>{stats.partialOrders}</Text>
          <Text style={styles.cardAction}>👆 View partial</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.card, styles.halfCard, styles.clickableCard]}
          onPress={() => navigation.navigate('BookingsListScreen', { dateFilter: 'today' })}
          activeOpacity={0.7}
        >
          <Text style={styles.cardTitle}>Today's Orders</Text>
          <Text style={styles.cardValue}>{stats.todayBookings}</Text>
          <Text style={styles.cardAction}>👆 View today's</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <TouchableOpacity 
          style={[styles.card, styles.halfCard, styles.clickableCard]}
          onPress={() => navigation.navigate('CustomersListScreen', { filter: 'domestic' })}
          activeOpacity={0.7}
        >
          <Text style={styles.cardTitle}>Domestic</Text>
          <Text style={[styles.cardValue, { color: '#007AFF' }]}>{stats.domesticCustomers}</Text>
          <Text style={styles.cardAction}>👆 View domestic</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.card, styles.halfCard, styles.clickableCard]}
          onPress={() => navigation.navigate('CustomersListScreen', { filter: 'commercial' })}
          activeOpacity={0.7}
        >
          <Text style={styles.cardTitle}>Commercial</Text>
          <Text style={[styles.cardValue, { color: '#FF3B30' }]}>{stats.commercialCustomers}</Text>
          <Text style={styles.cardAction}>👆 View commercial</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.card, styles.clickableCard]}
        onPress={() => navigation.navigate('CustomersListScreen', { filter: 'subsidy' })}
        activeOpacity={0.7}
      >
        <Text style={styles.cardTitle}>Subsidy Customers</Text>
        <Text style={[styles.cardValue, { color: '#34C759' }]}>{stats.subsidyCustomers}</Text>
        <Text style={styles.cardAction}>👆 Tap to view subsidy customers</Text>
      </TouchableOpacity>

      {/* Quick Action Floating Button */}
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => navigation.navigate('BookingScreen')}
        activeOpacity={0.8}
      >
        <Text style={styles.floatingButtonText}>📋 Quick Book</Text>
      </TouchableOpacity>

      {/* Price Management Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={priceModalVisible}
        onRequestClose={() => setPriceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>🔧 Price Management</Text>
              <TouchableOpacity onPress={() => setPriceModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={[styles.priceLabel, { color: colors.text }]}>14.2kg Cylinder Price:</Text>
              <TextInput
                style={[styles.priceInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={tempPrices['14.2kg'].toString()}
                onChangeText={(text) => setTempPrices(prev => ({ ...prev, '14.2kg': parseInt(text) || 0 }))}
                keyboardType="numeric"
                placeholder="Enter price"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.priceLabel, { color: colors.text }]}>5kg Cylinder Price:</Text>
              <TextInput
                style={[styles.priceInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={tempPrices['5kg'].toString()}
                onChangeText={(text) => setTempPrices(prev => ({ ...prev, '5kg': parseInt(text) || 0 }))}
                keyboardType="numeric"
                placeholder="Enter price"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.priceLabel, { color: colors.text }]}>19kg Cylinder Price:</Text>
              <TextInput
                style={[styles.priceInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={tempPrices['19kg'].toString()}
                onChangeText={(text) => setTempPrices(prev => ({ ...prev, '19kg': parseInt(text) || 0 }))}
                keyboardType="numeric"
                placeholder="Enter price"
                placeholderTextColor={colors.textSecondary}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setTempPrices({...prices});
                    setPriceModalVisible(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={savePrices}
                >
                  <Text style={styles.saveButtonText}>Save Prices</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { 
    padding: 20, 
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  header: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center',
    color: colors.text,
  },
  summaryBanner: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
    width: '48%',
  },
  filterButton: {
    backgroundColor: '#007AFF',
  },
  actionText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clickableCard: {
    borderWidth: 1,
    borderColor: colors.border,
    transform: [{ scale: 1 }],
  },
  halfCard: {
    width: '47%',
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: { 
    fontSize: 16, 
    color: colors.textSecondary,
    marginBottom: 5,
  },
  cardValue: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginTop: 5,
    marginBottom: 8,
    color: colors.text,
  },
  cardAction: {
    fontSize: 12,
    color: colors.primary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 5,
  },
  floatingButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    elevation: 8,
  },
  floatingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  inventoryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inventoryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    borderRadius: 15,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 15,
  },
  priceInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#ff4444',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});