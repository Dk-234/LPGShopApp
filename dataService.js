import { db } from './firebaseConfig';
import { getCurrentUserPhone } from './auth';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, onSnapshot, orderBy, limit } from 'firebase/firestore';

// Get current user's phone for data isolation
const getCurrentUser = async () => {
  const userPhone = await getCurrentUserPhone();
  if (!userPhone) {
    throw new Error('User not authenticated');
  }
  return userPhone;
};

// Customer operations
export const addCustomer = async (customerData) => {
  const userPhone = await getCurrentUser();
  
  return await addDoc(collection(db, 'customers'), {
    ...customerData,
    userPhone,
    createdAt: new Date()
  });
};

export const getCustomers = async () => {
  const userPhone = await getCurrentUser();
  const q = query(collection(db, 'customers'), where('userPhone', '==', userPhone));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateCustomer = async (customerId, customerData) => {
  const userPhone = await getCurrentUser();
  
  return await updateDoc(doc(db, 'customers', customerId), {
    ...customerData,
    userPhone, // Ensure user phone is always included
    updatedAt: new Date()
  });
};

export const deleteCustomer = async (customerId) => {
  return await deleteDoc(doc(db, 'customers', customerId));
};

// Booking operations
export const addBooking = async (bookingData) => {
  const userPhone = await getCurrentUser();
  
  return await addDoc(collection(db, 'bookings'), {
    ...bookingData,
    userPhone,
    createdAt: new Date()
  });
};

export const getBookings = async (filter = null) => {
  const userPhone = await getCurrentUser();
  let q = query(collection(db, 'bookings'), where('userPhone', '==', userPhone));
  
  if (filter) {
    q = query(q, where('paymentStatus', '==', filter));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateBooking = async (bookingId, bookingData) => {
  const userPhone = await getCurrentUser();
  
  return await updateDoc(doc(db, 'bookings', bookingId), {
    ...bookingData,
    userPhone, // Ensure user phone is always included
    updatedAt: new Date()
  });
};

export const deleteBooking = async (bookingId) => {
  return await deleteDoc(doc(db, 'bookings', bookingId));
};

// Inventory operations
export const addInventoryItem = async (inventoryData) => {
  const userPhone = await getCurrentUser();
  
  return await addDoc(collection(db, 'inventory'), {
    ...inventoryData,
    userPhone,
    createdAt: new Date()
  });
};

export const getInventory = async () => {
  const userPhone = await getCurrentUser();
  const q = query(collection(db, 'inventory'), where('userPhone', '==', userPhone));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateInventoryItem = async (inventoryId, inventoryData) => {
  const userPhone = await getCurrentUser();
  
  return await updateDoc(doc(db, 'inventory', inventoryId), {
    ...inventoryData,
    userPhone, // Ensure user phone is always included
    updatedAt: new Date()
  });
};

export const deleteInventoryItem = async (inventoryId) => {
  return await deleteDoc(doc(db, 'inventory', inventoryId));
};

// Cylinder operations
export const getCylinders = async () => {
  const userPhone = await getCurrentUser();
  const q = query(collection(db, 'cylinders'), where('userPhone', '==', userPhone));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addCylinder = async (cylinderData) => {
  const userPhone = await getCurrentUser();
  
  return await addDoc(collection(db, 'cylinders'), {
    ...cylinderData,
    userPhone,
    createdAt: new Date()
  });
};

export const updateCylinder = async (cylinderId, cylinderData) => {
  const userPhone = await getCurrentUser();
  
  return await updateDoc(doc(db, 'cylinders', cylinderId), {
    ...cylinderData,
    userPhone, // Ensure user phone is always included
    updatedAt: new Date()
  });
};

export const deleteCylinder = async (cylinderId) => {
  return await deleteDoc(doc(db, 'cylinders', cylinderId));
};

// Stove operations
export const getStoves = async () => {
  const userPhone = await getCurrentUser();
  const q = query(collection(db, 'stoves'), where('userPhone', '==', userPhone));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addStove = async (stoveData) => {
  const userPhone = await getCurrentUser();
  
  return await addDoc(collection(db, 'stoves'), {
    ...stoveData,
    userPhone,
    createdAt: new Date()
  });
};

export const updateStove = async (stoveId, stoveData) => {
  const userPhone = await getCurrentUser();
  
  return await updateDoc(doc(db, 'stoves', stoveId), {
    ...stoveData,
    userPhone, // Ensure user phone is always included
    updatedAt: new Date()
  });
};

export const deleteStove = async (stoveId) => {
  return await deleteDoc(doc(db, 'stoves', stoveId));
};

// Get user-specific inventory counts
export const getInventoryCounts = async () => {
  const userPhone = await getCurrentUser();
  
  // Get cylinders
  const cylindersQuery = query(collection(db, 'cylinders'), where('userPhone', '==', userPhone));
  const cylindersSnap = await getDocs(cylindersQuery);
  
  // Get stoves
  const stovesQuery = query(collection(db, 'stoves'), where('userPhone', '==', userPhone));
  const stovesSnap = await getDocs(stovesQuery);
  
  // Count cylinders by type and status
  const cylinderCounts = {
    "14.2kg": { FULL: 0, EMPTY: 0 },
    "5kg": { FULL: 0, EMPTY: 0 },
    "19kg": { FULL: 0, EMPTY: 0 }
  };
  
  let totalFull = 0;
  let totalEmpty = 0;
  
  cylindersSnap.forEach((doc) => {
    const data = doc.data();
    const type = data.type;
    const status = data.status;
    
    if (cylinderCounts[type] && (status === "FULL" || status === "EMPTY")) {
      cylinderCounts[type][status]++;
      if (status === "FULL") totalFull++;
      if (status === "EMPTY") totalEmpty++;
    }
  });
  
  // Count stoves by status
  let availableStoves = 0;
  let lentStoves = 0;
  
  stovesSnap.forEach((doc) => {
    const data = doc.data();
    if (data.status === "AVAILABLE") availableStoves++;
    if (data.status === "LENT") lentStoves++;
  });
  
  return {
    cylinderCounts,
    counts: {
      fullCylinders: totalFull,
      emptyCylinders: totalEmpty,
      availableStoves,
      lentStoves,
    }
  };
};

// Real-time inventory updates
export const subscribeToInventoryUpdates = (callback) => {
  return getCurrentUser().then(userPhone => {
    const unsubscribes = [];
    
    // Subscribe to cylinders
    const cylindersQuery = query(collection(db, 'cylinders'), where('userPhone', '==', userPhone));
    unsubscribes.push(onSnapshot(cylindersQuery, () => callback()));
    
    // Subscribe to stoves
    const stovesQuery = query(collection(db, 'stoves'), where('userPhone', '==', userPhone));
    unsubscribes.push(onSnapshot(stovesQuery, () => callback()));
    
    // Return combined unsubscribe function
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  });
};

// Real-time listeners with user isolation
export const subscribeToCustomers = (callback) => {
  return getCurrentUser().then(userPhone => {
    const q = query(collection(db, 'customers'), where('userPhone', '==', userPhone));
    return onSnapshot(q, (snapshot) => {
      const customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(customers);
    });
  });
};

export const subscribeToBookings = (callback, filter = null) => {
  return getCurrentUser().then(userPhone => {
    let q = query(collection(db, 'bookings'), where('userPhone', '==', userPhone));
    
    if (filter) {
      q = query(q, where('paymentStatus', '==', filter));
    }
    
    return onSnapshot(q, (snapshot) => {
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(bookings);
    });
  });
};

export const subscribeToInventory = (callback) => {
  return getCurrentUser().then(userPhone => {
    const q = query(collection(db, 'inventory'), where('userPhone', '==', userPhone));
    return onSnapshot(q, (snapshot) => {
      const inventory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(inventory);
    });
  });
};

// Lending Records operations
export const getLendingRecords = async () => {
  const userPhone = await getCurrentUser();
  const q = query(collection(db, 'lendingRecords'), where('userPhone', '==', userPhone));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addLendingRecord = async (recordData) => {
  const userPhone = await getCurrentUser();
  
  return await addDoc(collection(db, 'lendingRecords'), {
    ...recordData,
    userPhone,
    createdAt: new Date()
  });
};

export const updateLendingRecord = async (recordId, recordData) => {
  const userPhone = await getCurrentUser();
  
  return await updateDoc(doc(db, 'lendingRecords', recordId), {
    ...recordData,
    userPhone,
    updatedAt: new Date()
  });
};

export const deleteLendingRecord = async (recordId) => {
  return await deleteDoc(doc(db, 'lendingRecords', recordId));
};

// Bulk cylinder operations
export const addMultipleCylinders = async (cylinderData, quantity) => {
  const userPhone = await getCurrentUser();
  const promises = [];
  
  for (let i = 0; i < quantity; i++) {
    promises.push(addDoc(collection(db, 'cylinders'), {
      ...cylinderData,
      userPhone,
      createdAt: new Date()
    }));
  }
  
  return await Promise.all(promises);
};

export const removeCylinders = async (cylinderType, status, quantity) => {
  const userPhone = await getCurrentUser();
  const q = query(
    collection(db, 'cylinders'), 
    where('userPhone', '==', userPhone),
    where('type', '==', cylinderType),
    where('status', '==', status),
    limit(quantity)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.size < quantity) {
    throw new Error(`insufficient: Only ${snapshot.size} ${cylinderType} cylinders (${status}) available`);
  }
  
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  
  return await Promise.all(deletePromises);
};

// Get user-specific lending history
export const getLendingHistory = async () => {
  const userPhone = await getCurrentUser();
  const q = query(
    collection(db, 'lendingRecords'), 
    where('userPhone', '==', userPhone),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// User authentication operations
export const createUser = async (phone, pin) => {
  try {
    // Check if user already exists
    const existingUser = await getUserByPhone(phone);
    if (existingUser) {
      throw new Error('User with this phone number already exists');
    }
    
    // Create new user
    return await addDoc(collection(db, 'users'), {
      phone,
      pin,
      createdAt: new Date(),
      lastLogin: null
    });
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const getUserByPhone = async (phone) => {
  try {
    const q = query(collection(db, 'users'), where('phone', '==', phone));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  } catch (error) {
    console.error('Error getting user by phone:', error);
    throw error;
  }
};

export const verifyUserCredentials = async (phone, pin) => {
  try {
    const user = await getUserByPhone(phone);
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    if (user.pin !== pin) {
      return { success: false, message: 'Invalid PIN' };
    }
    
    // Update last login time
    await updateDoc(doc(db, 'users', user.id), {
      lastLogin: new Date()
    });
    
    return { success: true, user };
  } catch (error) {
    console.error('Error verifying user credentials:', error);
    return { success: false, message: 'Authentication error' };
  }
};

export const updateUserPin = async (phone, newPin) => {
  try {
    const user = await getUserByPhone(phone);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    await updateDoc(doc(db, 'users', user.id), {
      pin: newPin,
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating user PIN:', error);
    throw error;
  }
};
