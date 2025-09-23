import React, { useState, createContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);

  const authContext = React.useMemo(() => ({
    userToken,
    signIn: async (mobileNumber) => {
      await AsyncStorage.setItem('userToken', mobileNumber);
      setUserToken(mobileNumber);
    },
    signOut: async () => {
      await AsyncStorage.removeItem('userToken');
      setUserToken(null);
    },
    restoreToken: async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        setUserToken(token);
      }
    },
  }), [userToken]);

  return (
    <AuthContext.Provider value={authContext}>
      {children}
    </AuthContext.Provider>
  );
};