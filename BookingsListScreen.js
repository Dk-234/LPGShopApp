import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, Animated, useColorScheme } from 'react-native';
import { getBookings, getCustomers, updateBooking as updateBookingInDB, deleteBooking, updateCustomer, getCylinders, removeCylinders } from './dataService';
import { doc, getDoc } from 'firebase/firestore'; // Keep these for settings/prices
import { db } from './firebaseConfig'; // Keep this for settings/prices
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
});

export default function BookingsListScreen({ route }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const styles = createStyles(colors);
  const [bookings, setBookings] = useState([]);
  const [bookingsWithCustomers, setBookingsWithCustomers] = useState([]);
  const [filter, setFilter] = useState('All'); // All/Pending/Delivered
  
  // Pricing constants (loaded from Firebase)
  const [CYLINDER_PRICES, setCYLINDER_PRICES] = useState({
    '14.2kg': 1150,
    '5kg': 450,
    '19kg': 1350
  });
  const [SERVICE_FEES, setSERVICE_FEES] = useState({
    'No': 0,
    'Pickup': 50,
    'Drop': 50,
    'Pickup + Drop': 70
  });
  const [paymentFilter, setPaymentFilter] = useState('All'); // All/Pending/Paid/Partial
  const [dateFilter, setDateFilter] = useState('all'); // all/today
  
  // Get initial filter from route params
  useEffect(() => {
    if (route?.params?.paymentFilter) {
      setPaymentFilter(route.params.paymentFilter);
    } else if (route?.params?.paymentFilter === undefined) {
      // Reset to 'All' if no filter is provided
      setPaymentFilter('All');
    }
    
    // Handle date filter from route params
    if (route?.params?.dateFilter) {
      setDateFilter(route.params.dateFilter);
    } else {
      setDateFilter('all');
    }
  }, [route?.params?.paymentFilter, route?.params?.dateFilter]);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(300));

  // Load prices and service fees from Firebase
  const loadPricesAndFees = async () => {
    try {
      // Load cylinder prices
      const pricesDoc = await getDoc(doc(db, "settings", "prices"));
      if (pricesDoc.exists()) {
        setCYLINDER_PRICES(pricesDoc.data());
      }
      
      // Load service fees
      const serviceFeesDoc = await getDoc(doc(db, "settings", "serviceFees"));
      if (serviceFeesDoc.exists()) {
        setSERVICE_FEES(serviceFeesDoc.data());
      }
    } catch (error) {
      console.error("Error loading prices and fees:", error);
    }
  };

  // Load prices and fees on component mount
  useEffect(() => {
    loadPricesAndFees();
  }, []);

  // Function to load bookings data
  const loadBookings = async () => {
    try {
      const bookingsList = await getBookings();
      const customersList = await getCustomers();
      
      let filteredBookings = bookingsList;
      
      // Apply delivery status filter
      if (filter !== 'All') {
        filteredBookings = bookingsList.filter(booking => booking.status === filter);
      }
      
      setBookings(filteredBookings);
      
      // Fetch customer details for each booking
      let bookingsWithCustomerData = filteredBookings.map(booking => {
        const customer = customersList.find(c => c.id === booking.customerId);
        return {
          ...booking,
          customerName: customer?.name || "Customer Not Found",
          customerPhone: customer?.phone || "N/A",
          customerBookId: customer?.bookId || "N/A",
        };
      });
      
      // Apply payment filter
      if (paymentFilter !== 'All') {
        bookingsWithCustomerData = bookingsWithCustomerData.filter(booking => {
          const paymentStatus = booking.payment?.status || 'Pending';
          return paymentStatus === paymentFilter;
        });
      }
      
      // Apply date filter (2-day filter for today's bookings)
      if (dateFilter === 'today') {
        const now = new Date();
        const twoDaysFromNow = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000));
        
        bookingsWithCustomerData = bookingsWithCustomerData.filter(booking => {
          const deliveryDate = booking.deliveryDate?.toDate ? booking.deliveryDate.toDate() : new Date(booking.deliveryDate);
          // Show bookings with delivery date within next 2 days
          return deliveryDate <= twoDaysFromNow;
        });
      }
      
      // Apply sorting based on filter type
      if (filter === 'All') {
        // Sort bookings: Active orders first, then completed orders
        const activeOrders = bookingsWithCustomerData.filter(booking => booking.status !== 'Delivered');
        const completedOrders = bookingsWithCustomerData.filter(booking => booking.status === 'Delivered');
        
        activeOrders.sort((a, b) => {
          const aDate = a.deliveryDate?.toDate ? a.deliveryDate.toDate() : new Date(a.deliveryDate || 0);
          const bDate = b.deliveryDate?.toDate ? b.deliveryDate.toDate() : new Date(b.deliveryDate || 0);
          return aDate - bDate;
        });
        
        completedOrders.sort((a, b) => {
          const aUpdated = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt || a.createdAt || 0);
          const bUpdated = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt || b.createdAt || 0);
          return bUpdated - aUpdated;
        });
        
        bookingsWithCustomerData = [...activeOrders, ...completedOrders];
      } else {
        // For specific filters, sort by delivery date
        bookingsWithCustomerData.sort((a, b) => {
          const aDate = a.deliveryDate?.toDate ? a.deliveryDate.toDate() : new Date(a.deliveryDate || 0);
          const bDate = b.deliveryDate?.toDate ? b.deliveryDate.toDate() : new Date(b.deliveryDate || 0);
          return aDate - bDate;
        });
      }
      
      setBookingsWithCustomers(bookingsWithCustomerData);
      
      // Also load cylinder counts for inventory warnings
      await loadCylinderCounts();
    } catch (error) {
      console.error('Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    }
  };

  useEffect(() => {
    loadBookings();
  }, [filter, paymentFilter, dateFilter]);

  // Auto-delete function for completed bookings after 20 hours
  const checkAndDeleteExpiredBookings = async (bookings) => {
    const now = new Date();
    const expiredBookings = [];

    bookings.forEach(booking => {
      const isPaidAndDelivered = booking.payment?.status === 'Paid' && booking.status === 'Delivered';
      
      if (isPaidAndDelivered && booking.updatedAt) {
        const updatedTime = booking.updatedAt.toDate ? booking.updatedAt.toDate() : new Date(booking.updatedAt);
        const hoursDifference = (now - updatedTime) / (1000 * 60 * 60);
        
        if (hoursDifference >= 20) {
          expiredBookings.push(booking);
        }
      }
    });

    // Delete expired bookings using dataService
    if (expiredBookings.length > 0) {
      for (const booking of expiredBookings) {
        try {
          await deleteBooking(booking.id);
        } catch (error) {
          console.error(`❌ Error deleting booking ${booking.id}:`, error);
        }
      }
    }
  };

  // Enhanced auto-delete checker that runs periodically
  useEffect(() => {
    const autoDeleteInterval = setInterval(async () => {

      if (bookings.length > 0) {
        await checkAndDeleteExpiredBookings(bookings);
      }
    }, 5 * 60 * 1000); // Run every 5 minutes

    return () => clearInterval(autoDeleteInterval);
  }, [bookings]);

  // Update timers every minute for real-time countdown
  useEffect(() => {
    const timerUpdateInterval = setInterval(() => {
      // Force re-render to update timer displays
      setBookingsWithCustomers(prevBookings => [...prevBookings]);
    }, 60000); // Update every minute

    return () => clearInterval(timerUpdateInterval);
  }, []);

  const openModal = (booking) => {
    // Check if booking is paid and delivered (locked state)
    const isLocked = booking.payment?.status === 'Paid' && booking.status === 'Delivered';
    
    if (isLocked) {
      Alert.alert(
        "⚠️ Booking Complete",
        "This booking is already paid and delivered. No further changes are allowed.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }
    
    setSelectedBooking(booking);
    setPaymentStatus(booking.payment?.status || 'Pending');
    setPaymentAmount(booking.payment?.amount || '');
    setDeliveryStatus(booking.status || 'Booked');
    setModalVisible(true);
    
    // Animate modal opening
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => {
      setModalVisible(false);
      setSelectedBooking(null);
    });
  };

  const updateBooking = async () => {
    if (!selectedBooking) return;
    
    // Show confirmation dialog before making changes
    const showUpdateConfirmation = () => {
      return new Promise((resolve) => {
        Alert.alert(
          "🔄 Confirm Update",
          "Are you sure you want to update this booking?",
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Update", style: "default", onPress: () => resolve(true) }
          ]
        );
      });
    };
    
    const confirmed = await showUpdateConfirmation();
    if (!confirmed) return;
    
    setIsUpdating(true);
    
    try {
      const paymentDate = new Date();
      
      // Calculate actual amount for paid status
      const getActualAmount = () => {
        if (paymentStatus === 'Partial') {
          return paymentAmount;
        } else if (paymentStatus === 'Paid') {
          const cylinderCost = calculateCylinderCost(selectedBooking);
          const serviceFee = SERVICE_FEES[selectedBooking.serviceType] || 0;
          return (cylinderCost + serviceFee).toString();
        } else {
          return 0;
        }
      };
      
      const updateData = {
        payment: {
          status: paymentStatus,
          amount: getActualAmount(),
          lastPaymentDate: paymentStatus === 'Paid' || paymentStatus === 'Partial' ? paymentDate : selectedBooking.payment?.lastPaymentDate || null,
        },
        status: deliveryStatus,
        updatedAt: paymentDate, // This timestamp will be used for 20-hour deletion countdown
      };
      
      console.log('📝 Updating booking with data:', updateData);
      await updateBookingInDB(selectedBooking.id, updateData);
      console.log('✅ Booking update completed successfully');
      
      // Update inventory when delivery status changes to "Delivered"
      if (deliveryStatus === 'Delivered' && selectedBooking.status !== 'Delivered') {
        try {
          await updateInventoryOnDelivery(selectedBooking);
        } catch (inventoryError) {
          console.log("Inventory update was cancelled or failed:", inventoryError.message);
          // If user cancelled due to insufficient inventory, don't proceed with delivery
          if (inventoryError.message.includes("cancelled by user")) {
            Alert.alert("Delivery Cancelled", "The delivery was not completed due to insufficient Stock.");
            return; // Exit the function without updating the booking
          }
          // For other inventory errors, log but continue with delivery
          console.warn("Inventory update failed but continuing with delivery:", inventoryError.message);
        }
      }
      
      // Update customer payment history if payment was made OR if updating delivery status for already paid orders
      if (paymentStatus === 'Paid' || paymentStatus === 'Partial') {
        await updateCustomerPaymentHistory(selectedBooking.customerId, paymentDate, paymentStatus, paymentAmount);
        // Also fix any existing "FULL" amounts for this customer
        await fixFullAmountsInHistory(selectedBooking.customerId, selectedBooking);
      } else if (selectedBooking.payment?.status === 'Paid' && deliveryStatus !== selectedBooking.status) {
        // Update existing payment record when delivery status changes for paid orders
        await updateExistingPaymentRecord(selectedBooking.customerId, selectedBooking.id, deliveryStatus);
        // Also fix any existing "FULL" amounts for this customer
        await fixFullAmountsInHistory(selectedBooking.customerId, selectedBooking);
      }
      
      // Special notification for completed orders
      const isNowComplete = paymentStatus === 'Paid' && deliveryStatus === 'Delivered';
      
      Alert.alert(
        "Success! 🎉", 
        isNowComplete 
          ? "Booking updated successfully!\n\n⏰ This completed order will be automatically removed in 20 hours."
          : "Booking updated successfully!",
        [{ text: "OK", onPress: () => {
          closeModal();
          loadBookings(); // Refresh the bookings list to show updated status
        }}]
      );
      
    } catch (error) {
      Alert.alert("Error", "Failed to update booking: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Function to update customer payment history
  const updateCustomerPaymentHistory = async (customerId, paymentDate, paymentStatus, amount) => {
    try {
      // Get customers to find the specific customer
      const customers = await getCustomers();
      const customer = customers.find(c => c.id === customerId);
      
      if (customer) {
        const currentHistory = customer.paymentHistory || [];
        
        // Determine transaction status based on BOTH payment and delivery status
        let transactionStatus;
        if (paymentStatus === 'Paid' && deliveryStatus === 'Delivered') {
          transactionStatus = 'Completed';
        } else if (paymentStatus === 'Paid') {
          transactionStatus = 'Paid - Pending Delivery';
        } else if (paymentStatus === 'Partial') {
          transactionStatus = 'Partial Payment';
        } else {
          transactionStatus = 'Pending';
        }
        
        // Create new payment record
        const getHistoryAmount = () => {
          if (paymentStatus === 'Partial') {
            return amount;
          } else if (paymentStatus === 'Paid') {
            const cylinderCost = calculateCylinderCost(selectedBooking);
            const serviceFee = SERVICE_FEES[selectedBooking.serviceType] || 0;
            return (cylinderCost + serviceFee).toString();
          } else {
            return '0';
          }
        };
        
        const newPayment = {
          date: paymentDate,
          status: transactionStatus, // Use the combined status
          amount: getHistoryAmount(),
          bookingId: selectedBooking.id,
          timestamp: paymentDate.getTime(), // For sorting
          paymentStatus: paymentStatus, // Keep original payment status for reference
          deliveryStatus: deliveryStatus // Keep delivery status for reference
        };
        
        // Add new payment and sort by timestamp (newest first)
        const updatedHistory = [newPayment, ...currentHistory]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 30) // Keep only last 30 transactions
          .map(transaction => {
            // Fix any existing "FULL" amounts with actual calculated amounts
            if (transaction.amount === 'FULL' && transaction.paymentStatus === 'Paid' && transaction.bookingId) {
              // Try to get booking details for calculation
              if (transaction.bookingId === selectedBooking.id) {
                const cylinderCost = calculateCylinderCost(selectedBooking);
                const serviceFee = SERVICE_FEES[selectedBooking.serviceType] || 0;
                return {
                  ...transaction,
                  amount: (cylinderCost + serviceFee).toString()
                };
              }
              // For other bookings, we can't calculate without booking details, but mark it as needs update
              return {
                ...transaction,
                amount: transaction.amount // Keep as is for now, will be fixed when that booking is updated
              };
            }
            return transaction;
          });
        
        // Update customer document
        await updateCustomer(customerId, {
          paymentHistory: updatedHistory,
          payment: {
            ...customer.payment,
            lastPaymentDate: paymentDate,
            status: paymentStatus // Update current payment status
          }
        });
      }
    } catch (error) {
      console.error("Error updating customer payment history:", error);
    }
  };

  // Function to update existing payment record when delivery status changes
  const updateExistingPaymentRecord = async (customerId, bookingId, newDeliveryStatus) => {
    try {
      const customerRef = doc(db, "customers", customerId);
      const customerSnap = await getDoc(customerRef);
      
      if (customerSnap.exists()) {
        const customerData = customerSnap.data();
        const currentHistory = customerData.paymentHistory || [];
        
        // Find and update the existing payment record for this booking
        const updatedHistory = currentHistory.map(transaction => {
          if (transaction.bookingId === bookingId) {
            // Update the status based on new delivery status
            let newStatus;
            if (transaction.paymentStatus === 'Paid' && newDeliveryStatus === 'Delivered') {
              newStatus = 'Completed';
            } else if (transaction.paymentStatus === 'Paid') {
              newStatus = 'Paid - Pending Delivery';
            } else {
              newStatus = transaction.status; // Keep existing status if not paid
            }
            
            // Calculate actual amount if it's currently "FULL" or if payment is "Paid"
            let updatedAmount = transaction.amount;
            if (transaction.paymentStatus === 'Paid' && (transaction.amount === 'FULL' || !transaction.amount)) {
              const cylinderCost = calculateCylinderCost(selectedBooking);
              const serviceFee = SERVICE_FEES[selectedBooking.serviceType] || 0;
              updatedAmount = (cylinderCost + serviceFee).toString();
            }
            
            return {
              ...transaction,
              status: newStatus,
              deliveryStatus: newDeliveryStatus,
              amount: updatedAmount
            };
          }
          return transaction;
        });
        
        // Update customer document with modified history
        await updateCustomer(customerId, {
          paymentHistory: updatedHistory
        });
      }
    } catch (error) {
      console.error("Error updating existing payment record:", error);
    }
  };

  // Utility function to fix "FULL" amounts in existing payment records
  const fixFullAmountsInHistory = async (customerId, bookingDetails) => {
    try {
      // Get customers to find the specific customer
      const customers = await getCustomers();
      const customer = customers.find(c => c.id === customerId);
      
      if (customer) {
        const currentHistory = customer.paymentHistory || [];
        
        // Check if there are any "FULL" amounts that need fixing
        const hasFullAmounts = currentHistory.some(transaction => transaction.amount === 'FULL');
        
        if (hasFullAmounts && bookingDetails) {
          const updatedHistory = currentHistory.map(transaction => {
            if (transaction.amount === 'FULL' && transaction.paymentStatus === 'Paid') {
              const cylinderCost = calculateCylinderCost(bookingDetails);
              const serviceFee = SERVICE_FEES[bookingDetails.serviceType] || 0;
              return {
                ...transaction,
                amount: (cylinderCost + serviceFee).toString()
              };
            }
            return transaction;
          });
          
          // Update customer document with fixed amounts
          await updateCustomer(customerId, {
            paymentHistory: updatedHistory
          });
          
          console.log(`Fixed FULL amounts in payment history for customer ${customerId}`);
        }
      }
    } catch (error) {
      console.error("Error fixing FULL amounts in payment history:", error);
    }
  };

  // Inventory update function for delivery completion
  const updateInventoryOnDelivery = async (booking) => {
    try {
      const cylinderType = booking.cylinderType || '14.2kg';
      const quantity = booking.cylinders || 1;
      
      console.log(`Attempting to remove ${quantity} full ${cylinderType} cylinders from inventory`);
      
      // Use the dataService removeCylinders function for user-isolated operations
      await removeCylinders(cylinderType, "FULL", quantity);
      
      console.log(`Successfully removed ${quantity} full ${cylinderType} cylinders from inventory`);
    } catch (error) {
      console.error("Error updating inventory on delivery:", error);
      
      // If it's an insufficient cylinders error, show confirmation popup
      if (error.message && error.message.includes('insufficient:')) {
        console.warn(`Inventory warning: ${error.message}`);
        
        // Show confirmation popup for insufficient inventory
        return new Promise((resolve) => {
          Alert.alert(
            "⚠️ Insufficient Stock",
            `${error.message}\n\nDo you want to proceed with the delivery anyway? This will mark the order as delivered but inventory won't be updated.`,
            [
              {
                text: "Cancel Delivery", 
                style: "cancel",
                onPress: () => {
                  // Throw error to prevent delivery update
                  resolve(Promise.reject(new Error("Delivery cancelled by user due to insufficient Stock")));
                }
              },
              {
                text: "Proceed Anyway", 
                style: "default",
                onPress: () => {
                  console.log("User chose to proceed with delivery despite insufficient Stock ");
                  resolve(Promise.resolve());
                }
              }
            ],
            { cancelable: false }
          );
        });
      } else {
        // For other errors, we still don't want to break the delivery process
        console.error("Unexpected error updating inventory:", error);
        // Still allow delivery to proceed for other types of errors
      }
    }
  };

  // Helper function to calculate price based on cylinder type
  const calculateCylinderCost = (booking) => {
    const cylinderType = booking.cylinderType || '14.2kg'; // Default to 14.2kg for legacy bookings
    const pricePerCylinder = CYLINDER_PRICES[cylinderType] || CYLINDER_PRICES['14.2kg'];
    return booking.cylinders * pricePerCylinder;
  };

  // State for cylinder inventory counts
  const [cylinderCounts, setCylinderCounts] = useState({});

  // Function to load cylinder inventory counts
  const loadCylinderCounts = async () => {
    try {
      const cylinders = await getCylinders();
      const counts = {};
      
      cylinders.forEach(cylinder => {
        if (!counts[cylinder.type]) {
          counts[cylinder.type] = { FULL: 0, EMPTY: 0 };
        }
        counts[cylinder.type][cylinder.status] = (counts[cylinder.type][cylinder.status] || 0) + 1;
      });
      
      setCylinderCounts(counts);
    } catch (error) {
      console.error('Error loading cylinder counts:', error);
    }
  };

  // Helper function to check if booking has sufficient inventory
  const hasInsufficientInventory = (booking) => {
    const cylinderType = booking.cylinderType || '14.2kg';
    const quantity = booking.cylinders || 1;
    const available = cylinderCounts[cylinderType]?.FULL || 0;
    return available < quantity;
  };

  // Load cylinder counts on component mount
  useEffect(() => {
    loadCylinderCounts();
  }, []);

  // Helper function to format time remaining for auto-delete
  const formatTimeRemaining = (hoursLeft) => {
    if (hoursLeft <= 0) return '⚠️ Pending deletion';
    
    const hours = Math.floor(hoursLeft);
    const minutes = Math.floor((hoursLeft - hours) * 60);
    
    if (hours > 0) {
      return `⏰ Auto-delete in ${hours}h ${minutes}m`;
    } else {
      return `⏰ Auto-delete in ${minutes}m`;
    }
  };

  const renderItem = ({ item }) => {
    const isLocked = item.payment?.status === 'Paid' && item.status === 'Delivered';
    
    // Calculate auto-delete timer for completed bookings
    let isExpiringSoon = false;
    let hoursLeft = 0;
    let showTimer = false;
    let timerText = '';
    
    if (isLocked && item.updatedAt) {
      const now = new Date();
      const updatedTime = item.updatedAt.toDate ? item.updatedAt.toDate() : new Date(item.updatedAt);
      const hoursDifference = (now - updatedTime) / (1000 * 60 * 60);
      hoursLeft = Math.max(0, 20 - hoursDifference);
      isExpiringSoon = hoursLeft <= 4 && hoursLeft > 0;
      showTimer = true;
      timerText = formatTimeRemaining(hoursLeft);
    }
    
    // Check for insufficient inventory warning (only for pending deliveries)
    const isInventoryLow = item.status !== 'Delivered' && hasInsufficientInventory(item);
    
    return (
      <TouchableOpacity 
        style={[
          styles.bookingCard,
          isLocked && styles.lockedCard,
          isExpiringSoon && styles.expiringSoonCard
        ]} 
        onPress={() => openModal(item)}
        activeOpacity={0.7}
      >
      <Text style={styles.customerName}>{item.customerName}</Text>
      <Text style={styles.customerPhone}>Phone: {item.customerPhone}</Text>
      <Text style={styles.bookingDetails}>Book ID: {item.customerBookId || 'N/A'}</Text>
      <Text style={styles.bookingDetails}>DSC: {item.dscNumber || 'N/A'}</Text>
      <Text style={styles.bookingDetails}>
        Cylinders: {item.cylinders} × {item.cylinderType || '14.2kg'}
      </Text>
      <Text style={styles.bookingDetails}>
        Delivery: {item.deliveryDate?.toDate ? 
          item.deliveryDate.toDate().toDateString() : 
          new Date(item.deliveryDate).toDateString()}
      </Text>
      <Text style={styles.bookingDetails}>Service: {item.serviceType}</Text>
      <Text style={[
        styles.bookingDetails,
        item.payment.status === 'Paid' ? styles.paid : 
        item.payment.status === 'Partial' ? styles.partial : styles.pending
      ]}>
        Payment: {item.payment.status}
        {item.payment.amount && item.payment.status === 'Partial' && 
          ` (₹${item.payment.amount})`}
        {item.payment.status === 'Paid' && item.payment.amount && 
          ` (₹${item.payment.amount})`}
      </Text>
      
      {/* Delivery Status with visual indicator */}
      <View style={styles.statusContainer}>
        <View style={[
          styles.statusIndicator,
          item.status === 'Delivered' ? styles.completedIndicator : styles.activeIndicator
        ]} />
        <Text style={[
          styles.bookingStatus,
          item.status === 'Delivered' ? styles.completedStatus : styles.activeStatus
        ]}>
          {item.status === 'Delivered' ? '✅ Completed' : `🔄 ${item.status}`}
        </Text>
      </View>
      
      {/* Auto-delete timer for completed bookings */}
      {showTimer && (
        <View style={styles.timerContainer}>
          <Text style={[
            styles.timerText,
            hoursLeft <= 1 ? styles.urgentTimer : 
            isExpiringSoon ? styles.warningTimer : styles.normalTimer
          ]}>
            {timerText}
          </Text>
        </View>
      )}
      
      {/* Low inventory warning */}
      {isInventoryLow && (
        <View style={styles.inventoryWarning}>
          <Text style={styles.inventoryWarningText}>
            ⚠️ Insufficient Stock for this booking!
          </Text>
        </View>
      )}
      
      <Text style={[
        styles.tapHint,
        isLocked && styles.lockedHint
      ]}>
        {isLocked 
          ? '🔒 Complete - No changes allowed'
          : '👆 Tap to update'
        }
      </Text>
    </TouchableOpacity>
  );
};

  const renderModal = () => (
    <Modal
      animationType="none"
      transparent={true}
      visible={modalVisible}
      onRequestClose={closeModal}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.modalBackdrop,
            { opacity: fadeAnim }
          ]}
        >
          <TouchableOpacity 
            style={styles.modalBackdropTouch}
            onPress={closeModal}
            activeOpacity={1}
          />
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update Booking</Text>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {selectedBooking && (
            <View style={styles.modalContent}>
              <View style={styles.customerInfo}>
                <Text style={styles.modalCustomerName}>{selectedBooking.customerName}</Text>
                <Text style={styles.modalCustomerPhone}>{selectedBooking.customerPhone}</Text>
              </View>
              
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Payment Status:</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={paymentStatus}
                    onValueChange={setPaymentStatus}
                    style={styles.picker}
                  >
                    <Picker.Item label="Pending" value="Pending" />
                    <Picker.Item label="Paid" value="Paid" />
                    <Picker.Item label="Partial" value="Partial" />
                  </Picker>
                </View>
                
                {paymentStatus === 'Partial' && (
                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Amount Paid:</Text>
                    <TextInput
                      placeholder="Enter amount..."
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
                      keyboardType="numeric"
                      style={styles.textInput}
                    />
                  </View>
                )}
              </View>
              
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Delivery Status:</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={deliveryStatus}
                    onValueChange={setDeliveryStatus}
                    style={styles.picker}
                  >
                    <Picker.Item label="Booked" value="Booked" />
                    <Picker.Item label="In Transit" value="In Transit" />
                    <Picker.Item label="Delivered" value="Delivered" />
                    <Picker.Item label="Cancelled" value="Cancelled" />
                  </Picker>
                </View>
              </View>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.button, styles.cancelButton]} 
                  onPress={closeModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, styles.updateButton, isUpdating && styles.disabledButton]} 
                  onPress={updateBooking}
                  disabled={isUpdating}
                >
                  <Text style={styles.updateButtonText}>
                    {isUpdating ? '🔄 Updating...' : '✅ Update'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.filterLabel}>Delivery Status:</Text>
      <View style={styles.filterRow}>
        {['All', 'Booked', 'In Transit', 'Delivered'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.activeFilter]}
            onPress={() => setFilter(f)}
          >
            <Text style={[
              styles.filterText,
              filter === f && styles.activeFilterText
            ]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Date filter indicator */}
      {dateFilter === 'today' && (
        <View style={styles.dateFilterInfo}>
          <Text style={styles.dateFilterText}>📅 Showing bookings with delivery within 2 days</Text>
        </View>
      )}
      
      {/* Sorting information */}
      {filter === 'All' && bookingsWithCustomers.length > 0 && (
        <View style={styles.sortingInfo}>
          <Text style={styles.sortingText}>📋 Active orders shown first, then completed orders</Text>
        </View>
      )}
      {filter === 'In Transit' && bookingsWithCustomers.length > 0 && (
        <View style={styles.sortingInfo}>
          <Text style={styles.sortingText}>🚚 Sorted by delivery date - earliest deliveries first</Text>
        </View>
      )}

      <FlatList
        data={bookingsWithCustomers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
      
      {renderModal()}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 10, 
    backgroundColor: colors.background,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 10,
    color: colors.text,
  },
  bookingCard: {
    backgroundColor: colors.card,
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lockedCard: {
    backgroundColor: colors.surface,
    borderLeftColor: colors.textSecondary,
    opacity: 0.8,
  },
  expiringSoonCard: {
    backgroundColor: colors.warning + '20',
    borderLeftColor: colors.warning,
    opacity: 0.9,
  },
  customerName: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: colors.text,
    marginBottom: 5,
  },
  customerPhone: { 
    fontSize: 14, 
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  bookingDetails: { 
    fontSize: 14, 
    color: colors.text,
    marginBottom: 3,
  },
  bookingStatus: {
    fontSize: 14,
    color: colors.text,
    marginTop: 5,
    fontWeight: '500',
  },
  tapHint: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  lockedHint: {
    color: '#6c757d',
    fontWeight: 'bold',
  },
  // Timer styles for auto-delete countdown
  timerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 8,
    marginVertical: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  timerText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  normalTimer: {
    color: '#6c757d',
  },
  warningTimer: {
    color: '#ff8c00',
  },
  urgentTimer: {
    color: '#dc3545',
  },
  paid: { color: '#28a745', fontWeight: 'bold' },
  partial: { color: '#ffc107', fontWeight: 'bold' },
  pending: { color: '#dc3545', fontWeight: 'bold' },
  filterRow: { 
    flexDirection: 'row', 
    marginBottom: 15,
    justifyContent: 'space-around',
  },
  filterButton: { 
    padding: 12, 
    marginRight: 5, 
    borderWidth: 1, 
    borderColor: '#ccc',
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  activeFilter: { 
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterText: {
    color: '#333',
    fontWeight: '500',
  },
  activeFilterText: {
    color: 'white',
    fontWeight: 'bold',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdropTouch: {
    flex: 1,
    width: '100%',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
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
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  customerInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  modalCustomerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  modalCustomerPhone: {
    fontSize: 14,
    color: '#666',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
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
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: '#007AFF',
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  timerContainer: {
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  normalTimer: {
    color: '#856404',
  },
  warningTimer: {
    color: '#d39e00',
  },
  urgentTimer: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  expiringSoonCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  // Status indicator styles
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  activeIndicator: {
    backgroundColor: '#007AFF',
  },
  completedIndicator: {
    backgroundColor: '#34C759',
  },
  activeStatus: {
    color: '#007AFF',
    fontWeight: '600',
  },
  completedStatus: {
    color: '#34C759',
    fontWeight: '600',
  },
  // Sorting info styles
  sortingInfo: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortingText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Date filter styles
  dateFilterInfo: {
    backgroundColor: colors.primary + '15',
    padding: 8,
    borderRadius: 6,
    marginVertical: 5,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  dateFilterText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Inventory warning styles
  inventoryWarning: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  inventoryWarningText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});