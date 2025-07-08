import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';

export default function CustomersListScreen({ navigation, route }) {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const { filter } = route.params || {};

  useEffect(() => {
    const q = query(collection(db, "customers"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setCustomers(list);
    });
    return unsubscribe;
  }, []);

  // Filter customers based on the filter parameter
  const getFilteredCustomers = () => {
    if (filter === 'domestic') {
      return customers.filter(customer => customer.category === 'Domestic');
    } else if (filter === 'commercial') {
      return customers.filter(customer => customer.category === 'Commercial');
    } else if (filter === 'subsidy') {
      return customers.filter(customer => customer.subsidy === true);
    } else if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return customers.filter(customer => {
        const createdAt = customer.createdAt?.toDate ? customer.createdAt.toDate() : new Date(customer.createdAt);
        return createdAt >= today;
      });
    }
    return customers;
  };

  const filteredCustomers = getFilteredCustomers();

  const getFilterTitle = () => {
    switch (filter) {
      case 'domestic': return '🏠 Showing Domestic Customers Only';
      case 'commercial': return '🏢 Showing Commercial Customers Only';
      case 'subsidy': return '💰 Showing Subsidy Customers Only';
      case 'today': return '📅 Showing Today\'s Registrations Only';
      default: return '';
    }
  };

  const getEmptyMessage = () => {
    switch (filter) {
      case 'domestic': return 'No domestic customers found.';
      case 'commercial': return 'No commercial customers found.';
      case 'subsidy': return 'No subsidy customers found.';
      case 'today': return '📅 No new customer registrations today.';
      default: return 'No customers found';
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

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.item} 
      onPress={() => {
        setSelectedCustomer(item);
        setModalVisible(true);
      }}
    >
      <Text style={styles.name}>{item.name}</Text>
      <Text>Phone: {item.phone}</Text>
      {item.bookId && <Text>Book ID: {item.bookId}</Text>}
      <Text>Category: {item.category || 'Not Set'}</Text>
      <Text>Cylinders: {item.cylinders || 0}</Text>
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
      {item.subsidy && <Text style={styles.subsidyText}>💰 Subsidy Applicable</Text>}
      <TouchableOpacity 
        style={styles.bookButton}
        onPress={(e) => {
          e.stopPropagation();
          navigation.navigate('Booking', { customerId: item.id });
        }}
      >
        <Text style={styles.bookText}>Book Cylinder</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderCustomerDetailsModal = () => (
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
              </View>                <View style={styles.detailSection}>
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
                                  ₹{transaction.amount || 'N/A'}
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
                    navigation.navigate('Booking', { customerId: selectedCustomer.id });
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
  );

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
      
      <FlatList
        data={filteredCustomers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {getEmptyMessage()}
            </Text>
          </View>
        }
      />
      
      {renderCustomerDetailsModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  item: { 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    marginBottom: 5,
    borderRadius: 8,
  },
  name: { fontWeight: 'bold', fontSize: 16 },
  subsidyText: {
    color: '#34C759',
    fontWeight: 'bold',
    fontSize: 12,
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
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bookButton: { 
    backgroundColor: '#4CAF50', 
    padding: 5, 
    borderRadius: 5,
    marginTop: 5,
  },
  bookText: { 
    color: 'white', 
    textAlign: 'center' 
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