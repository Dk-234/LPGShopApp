import React, { createContext, useContext } from 'react';
import useAuth from './useAuth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const authState = useAuth();
  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
