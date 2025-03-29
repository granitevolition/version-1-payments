import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

// Create context
const PaymentContext = createContext();

/**
 * Payment Provider Component
 * Provides payment-related state and functions to child components
 */
export const PaymentProvider = ({ children }) => {
  // Loading state
  const [loading, setLoading] = useState(false);
  
  // Error state
  const [error, setError] = useState(null);
  
  // Current payment state
  const [currentPayment, setCurrentPayment] = useState(null);
  
  // Payment success state
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // Modal visibility
  const [modalVisible, setModalVisible] = useState(false);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Function to initiate payment
  const initiatePayment = useCallback(async (paymentData) => {
    try {
      setLoading(true);
      setError(null);
      
      // API call to initiate payment in our backend
      const response = await axios.post('/api/v1/payments/initiate', paymentData);
      
      // If successful, set current payment
      if (response.data.success) {
        setCurrentPayment(response.data.data);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Payment initiation failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to initiate payment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to handle successful payment
  const handlePaymentSuccess = useCallback((paymentData) => {
    setPaymentSuccess(true);
    setModalVisible(false);
    
    // If we have a callback, call it
    if (currentPayment && currentPayment.onSuccess) {
      currentPayment.onSuccess(paymentData);
    }
    
    // Check payment status from our backend to update the DB
    if (currentPayment && currentPayment.reference) {
      axios.get(`/api/v1/payments/status/${currentPayment.reference}`)
        .then(response => {
          if (response.data.success) {
            // Update local state with latest payment data
            setCurrentPayment(prev => ({ ...prev, ...response.data.data }));
          }
        })
        .catch(err => {
          console.error('Error checking payment status:', err);
        });
    }
  }, [currentPayment]);

  // Function to handle failed payment
  const handlePaymentFailure = useCallback((errorData) => {
    setError(errorData.message || 'Payment failed');
    setModalVisible(false);
    
    // If we have a callback, call it
    if (currentPayment && currentPayment.onFailure) {
      currentPayment.onFailure(errorData);
    }
  }, [currentPayment]);

  // Function to open payment modal
  const openPaymentModal = useCallback((phone, amount, callbacks = {}) => {
    setCurrentPayment({
      phone,
      amount,
      ...callbacks
    });
    setModalVisible(true);
  }, []);

  // Function to close payment modal
  const closePaymentModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  // Function to redirect to Lipia Checkout
  // This is for backward compatibility, but we prefer using the modal
  const redirectToLipiaCheckout = useCallback((phone, amount) => {
    const baseUrl = 'https://lipia-online.vercel.app/link/andikar';
    const params = new URLSearchParams();
    
    // Add callback URL
    const callbackUrl = `${window.location.origin}/payment/callback`;
    params.append('callback_url', callbackUrl);
    
    // Add phone and amount if Lipia supports them in the URL
    if (phone) params.append('phone', phone);
    if (amount) params.append('amount', amount);
    
    const url = `${baseUrl}?${params.toString()}`;
    
    // Open in a new window
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  // Context value
  const contextValue = {
    loading,
    error,
    currentPayment,
    paymentSuccess,
    modalVisible,
    initiatePayment,
    handlePaymentSuccess,
    handlePaymentFailure,
    openPaymentModal,
    closePaymentModal,
    redirectToLipiaCheckout,
    clearError
  };

  return (
    <PaymentContext.Provider value={contextValue}>
      {children}
    </PaymentContext.Provider>
  );
};

// Custom hook to use payment context
export const usePayment = () => {
  const context = useContext(PaymentContext);
  
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  
  return context;
};

export default PaymentContext;