import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePayment } from '../context/PaymentContext';
import axios from 'axios';
import './PaymentCallback.css';

/**
 * Payment Callback Page
 * Handles redirects from Lipia payment gateway
 * Displays payment status and automatically redirects back to the app
 */
const PaymentCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { handlePaymentSuccess, handlePaymentFailure } = usePayment();
  
  // State for processing status
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing your payment...');
  
  // Extract query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const paymentStatus = queryParams.get('status');
    const reference = queryParams.get('reference');
    const checkoutRequestId = queryParams.get('CheckoutRequestID');
    
    // If we don't have reference or status, redirect back to home
    if (!reference && !checkoutRequestId) {
      setStatus('error');
      setMessage('Invalid payment data. Redirecting back...');
      
      // Redirect to home after 3 seconds
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);
      
      return;
    }
    
    // Process payment status
    const processPayment = async () => {
      try {
        // Call our backend to check the payment status
        const response = await axios.get(`/api/v1/payments/status/${reference || checkoutRequestId}`);
        
        if (response.data.success) {
          // Handle successful payment
          if (response.data.data.status === 'completed') {
            setStatus('success');
            setMessage('Payment completed successfully!');
            handlePaymentSuccess(response.data.data);
          } 
          // Handle failed payment
          else if (response.data.data.status === 'failed') {
            setStatus('failed');
            setMessage('Payment failed. Please try again.');
            handlePaymentFailure({ message: 'Payment failed' });
          }
          // Handle processing payment
          else {
            setStatus('processing');
            setMessage('Payment is still processing...');
          }
        } else {
          // Handle error
          setStatus('error');
          setMessage('Error processing payment.');
          handlePaymentFailure({ message: 'Error processing payment' });
        }
      } catch (error) {
        // Handle error
        setStatus('error');
        setMessage('Error processing payment.');
        handlePaymentFailure({ message: error.message || 'Error processing payment' });
      } finally {
        // Redirect back to home after 3 seconds
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      }
    };
    
    // Process the payment
    processPayment();
    
    // If the page is opened directly from Lipia redirect
    if (window.opener && window.opener !== window) {
      // Send message to parent window
      window.opener.postMessage({
        type: 'PAYMENT_CALLBACK',
        status: paymentStatus,
        reference,
        checkoutRequestId
      }, window.location.origin);
      
      // Close window after sending message
      setTimeout(() => {
        window.close();
      }, 1000);
    }
  }, [location.search, navigate, handlePaymentSuccess, handlePaymentFailure]);
  
  // Send a postMessage to parent window if this is inside an iframe
  useEffect(() => {
    if (window.parent && window.parent !== window) {
      // Send message to parent window
      window.parent.postMessage({
        type: 'PAYMENT_CALLBACK',
        status,
        message
      }, '*');
    }
  }, [status, message]);
  
  // Render status message
  return (
    <div className={`payment-callback ${status}`}>
      <div className="payment-callback-container">
        {status === 'processing' && (
          <div className="payment-callback-spinner"></div>
        )}
        
        {status === 'success' && (
          <div className="payment-callback-icon success">✓</div>
        )}
        
        {(status === 'failed' || status === 'error') && (
          <div className="payment-callback-icon error">✗</div>
        )}
        
        <h2 className="payment-callback-title">
          {status === 'success' && 'Payment Successful!'}
          {status === 'processing' && 'Processing Payment'}
          {status === 'failed' && 'Payment Failed'}
          {status === 'error' && 'Payment Error'}
        </h2>
        
        <p className="payment-callback-message">{message}</p>
        
        <p className="payment-callback-redirect">
          Redirecting back to the application...
        </p>
      </div>
    </div>
  );
};

export default PaymentCallback;