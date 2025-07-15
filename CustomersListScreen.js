import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, ScrollView, useColorScheme, TextInput, Alert } from 'react-native';
import { getCustomers, deleteCustomer as deleteCustomerFromDB } from './dataService';

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

export default function CustomersListScreen({ navigation, route }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const styles = createStyles(colors);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const { filter } = route.params || {};

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const customersList = await getCustomers();
        setCustomers(customersList);
      } catch (error) {
        console.error('Error loading customers:', error);
        Alert.alert('Error', 'Failed to load customers');
      }
    };
    
    loadCustomers();
  }, []);

  // Filter customers based on the filter parameter and search query
  const getFilteredCustomers = () => {
    let filtered = customers;
    
    // Apply category filter first
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

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(customer => 
        customer.name?.toLowerCase().includes(query) ||
        customer.phone?.includes(query) ||
        customer.bookId?.toLowerCase().includes(query) ||
        customer.address?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredCustomers = getFilteredCustomers();

  // Delete customer function
  const handleDeleteCustomer = async (customerId, customerName) => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete "${customerName}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomerFromDB(customerId);
              Alert.alert('Success', 'Customer deleted successfully');
              // Reload customers after deletion
              const customersList = await getCustomers();
              setCustomers(customersList);
            } catch (error) {
              console.error('Error deleting customer:', error);
              Alert.alert('Error', 'Failed to delete customer. Please try again.');
            }
          },
        },
      ]
    );
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
      case 'domestic': return { backgroundColor: colors.primary + '20', borderColor: colors.primary };
      case 'commercial': return { backgroundColor: colors.error + '20', borderColor: colors.error };
      case 'subsidy': return { backgroundColor: colors.success + '20', borderColor: colors.success };
      case 'today': return { backgroundColor: colors.warning + '20', borderColor: colors.warning };
      default: return { backgroundColor: colors.warning + '20', borderColor: colors.warning };
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.item} 
      onPress={() => {
        setSelectedCustomer(item);
        setModalVisible(true);
      }}
      onLongPress={() => handleDeleteCustomer(item.id, item.name)}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.name}>{item.name}</Text>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeleteCustomer(item.id, item.name)}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.itemText}>📞 {item.phone}</Text>
      {item.bookId && <Text style={styles.itemText}>📖 Book ID: {item.bookId}</Text>}
      <Text style={styles.itemText}>🏷️ Category: {item.category || 'Not Set'}</Text>
      <Text style={styles.itemText}>🛢️ Cylinders: {item.cylinders || 0} × {item.cylinderType || '14.2kg'}</Text>
      <Text style={styles.paymentDate}>
        💰 Last Payment: {item.payment?.lastPaymentDate ? 
          new Date(item.payment.lastPaymentDate.seconds ? 
            item.payment.lastPaymentDate.toDate() : 
            item.payment.lastPaymentDate
          ).toLocaleDateString() : 
          'No payment recorded'}
      </Text>
      <Text style={styles.paymentHistory}>
        📊 Transactions: {item.paymentHistory ? 
          `${item.paymentHistory.length} transaction${item.paymentHistory.length !== 1 ? 's' : ''}` : 
          'No transactions'}
      </Text>
      {item.subsidy && <Text style={styles.subsidyText}>💰 Subsidy Applicable</Text>}
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
                  <Text style={styles.detailValue}>{selectedCustomer.cylinders || 0} × {selectedCustomer.cylinderType || '14.2kg'}</Text>
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

              {/* Payment Information Section */}
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
  );

  return (
    <View style={styles.container}>
      {/* Export Button */}
      <View style={styles.topBar}>
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={() => navigation.navigate('ExportScreen')}
        >
          <Text style={styles.exportButtonText}>📊 Export Data</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers by name, phone, book ID, or address..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

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
              {searchQuery.trim() ? 
                `No customers found matching "${searchQuery}"` :
                getEmptyMessage()
              }
            </Text>
          </View>
        }
      />
      
      {renderCustomerDetailsModal()}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 10, 
    backgroundColor: colors.background,
  },
  item: { 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    marginBottom: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { 
    fontWeight: 'bold', 
    fontSize: 16,
    color: colors.text,
  },
  subsidyText: {
    color: colors.success,
    fontWeight: 'bold',
    fontSize: 12,
  },
  filterBanner: {
    backgroundColor: colors.warning + '20', // Add transparency
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.warning,
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
    color: colors.text,
    marginBottom: 2,
  },
  filterCount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  clearFilterButton: {
    backgroundColor: colors.primary,
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
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bookButton: { 
    backgroundColor: colors.success, 
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
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  paymentHistory: {
    fontSize: 11,
    color: colors.primary,
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
    backgroundColor: colors.card,
    borderRadius: 15,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: colors.primary,
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
    color: colors.textSecondary,
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
    color: colors.text,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    flex: 2,
    textAlign: 'right',
  },
  clickableText: {
    color: colors.primary,
    fontWeight: '500',
  },
  subsidyValue: {
    color: colors.success,
    fontWeight: 'bold',
  },
  bookIdText: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: colors.primary,
  },
  paymentHistoryExpanded: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  transactionItem: {
    backgroundColor: colors.card,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  transactionAmount: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: 'bold',
  },
  transactionStatus: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  completedStatus: {
    color: colors.success,
    fontWeight: 'bold',
  },
  partialStatus: {
    color: colors.warning,
    fontWeight: 'bold',
  },
  transactionBooking: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  transactionDetails: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
    fontStyle: 'italic',
  },
  actionButtons: {
    marginTop: 10,
    marginBottom: 10,
  },
  bookLargeButton: {
    backgroundColor: colors.success,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  bookLargeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.inputBackground,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: colors.error + '20',
    marginLeft: 10,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 15,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exportButton: {
    backgroundColor: colors.warning,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  }
});