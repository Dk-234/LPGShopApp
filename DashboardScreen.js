import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';

export default function DashboardScreen({ navigation }) {
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

  const onRefresh = () => {
    setRefreshing(true);
    // Since we're using real-time updates, just set refreshing to false after a short delay
    setTimeout(() => setRefreshing(false), 1000);
  };

  useEffect(() => {
    // Fetch customers
    const customersQuery = query(collection(db, "customers"));
    const customersUnsubscribe = onSnapshot(customersQuery, (snapshot) => {
      const allCustomers = [];
      snapshot.forEach((doc) => {
        allCustomers.push({ id: doc.id, ...doc.data() });
      });
      setCustomers(allCustomers);
    });

    // Fetch bookings
    const bookingsQuery = query(collection(db, "bookings"));
    const bookingsUnsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      const allBookings = [];
      snapshot.forEach((doc) => {
        allBookings.push({ id: doc.id, ...doc.data() });
      });
      setBookings(allBookings);
    });

    return () => {
      customersUnsubscribe();
      bookingsUnsubscribe();
    };
  }, []);

  // Update stats whenever customers or bookings change
  useEffect(() => {
    // Only calculate stats if we have data
    if (customers.length === 0 && bookings.length === 0) return;
    
    // Calculate booking payment stats (from bookings, not customers)
    const unpaidOrders = bookings.filter(booking => booking.payment?.status === 'Pending' || !booking.payment?.status);
    const paidOrders = bookings.filter(booking => booking.payment?.status === 'Paid');
    const partialOrders = bookings.filter(booking => booking.payment?.status === 'Partial');
    
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
    
    console.log(`📊 Dashboard Stats - Total bookings: ${bookings.length}, Today's bookings (all pending deliveries): ${todayBookings.length}`);
    
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
    
    console.log(`📋 Breakdown: Overdue deliveries: ${overdueDeliveries}, Upcoming deliveries (next 24hrs): ${upcomingDeliveries}`);
    if (deliveredBookings.length > 0) {
      console.log(`📦 Delivered orders excluded: ${deliveredBookings.length}`);
    }

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
      <Text style={styles.header}>Shop Dashboard</Text>
      
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
          onPress={() => navigation.navigate('CustomersList')}
        >
          <Text style={styles.actionText}>👥 View All</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.card, styles.clickableCard]}
        onPress={() => navigation.navigate('CustomersList')}
        activeOpacity={0.7}
      >
        <Text style={styles.cardTitle}>Total Customers</Text>
        <Text style={styles.cardValue}>{stats.totalCustomers}</Text>
        <Text style={styles.cardAction}>👆 Tap to view all</Text>
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <TouchableOpacity 
          style={[styles.card, styles.halfCard, styles.clickableCard]}
          onPress={() => navigation.navigate('BookingsList', { paymentFilter: 'Pending' })}
          activeOpacity={0.7}
        >
          <Text style={styles.cardTitle}>Unpaid Orders</Text>
          <Text style={[styles.cardValue, { color: 'red' }]}>{stats.unpaidOrders}</Text>
          <Text style={styles.cardAction}>👆 View unpaid</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.card, styles.halfCard, styles.clickableCard]}
          onPress={() => navigation.navigate('BookingsList', { paymentFilter: 'Paid' })}
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
          onPress={() => navigation.navigate('BookingsList', { paymentFilter: 'Partial' })}
          activeOpacity={0.7}
        >
          <Text style={styles.cardTitle}>Partial Payments</Text>
          <Text style={[styles.cardValue, { color: 'orange' }]}>{stats.partialOrders}</Text>
          <Text style={styles.cardAction}>👆 View partial</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.card, styles.halfCard, styles.clickableCard]}
          onPress={() => navigation.navigate('BookingsList')}
          activeOpacity={0.7}
        >
          <Text style={styles.cardTitle}>Today's Bookings</Text>
          <Text style={styles.cardValue}>{stats.todayBookings}</Text>
          <Text style={styles.cardAction}>👆 View today's</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <TouchableOpacity 
          style={[styles.card, styles.halfCard, styles.clickableCard]}
          onPress={() => navigation.navigate('CustomersList', { filter: 'domestic' })}
          activeOpacity={0.7}
        >
          <Text style={styles.cardTitle}>Domestic</Text>
          <Text style={[styles.cardValue, { color: '#007AFF' }]}>{stats.domesticCustomers}</Text>
          <Text style={styles.cardAction}>👆 View domestic</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.card, styles.halfCard, styles.clickableCard]}
          onPress={() => navigation.navigate('CustomersList', { filter: 'commercial' })}
          activeOpacity={0.7}
        >
          <Text style={styles.cardTitle}>Commercial</Text>
          <Text style={[styles.cardValue, { color: '#FF3B30' }]}>{stats.commercialCustomers}</Text>
          <Text style={styles.cardAction}>👆 View commercial</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.card, styles.clickableCard]}
        onPress={() => navigation.navigate('CustomersList', { filter: 'subsidy' })}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  summaryBanner: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: '#6200ee',
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
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 3,
  },
  clickableCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    color: '#666',
    marginBottom: 5,
  },
  cardValue: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginTop: 5,
    marginBottom: 8,
  },
  cardAction: {
    fontSize: 12,
    color: '#007AFF',
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
});