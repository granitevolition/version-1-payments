import React, { useState, useEffect } from 'react';
import '../styles/PaymentModal.css';

/**
 * Payment Modal Component
 * 
 * A modal popup that embeds the Lipia payment form in an iframe
 * instead of redirecting the user to a new page.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {string} props.paymentUrl - The URL to the Lipia payment page
 * @param {Function} props.onClose - Function to call when the modal is closed
 * @param {Function} props.onSuccess - Function to call when payment is successful
 * @param {Function} props.onFailure - Function to call when payment fails
 */
const PaymentModal = ({ isOpen, paymentUrl, onClose, onSuccess, onFailure }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [frameHeight, setFrameHeight] = useState(600);
  const [paymentStatus, setPaymentStatus] = useState(null);

  // Handle message events from the iframe
  useEffect(() => {
    const handleMessage = (event) => {
      // Validate the origin of the message
      // In production, you should check if the origin is from Lipia
      
      if (event.data && event.data.type === 'payment_status') {
        setPaymentStatus(event.data.status);
        
        if (event.data.status === 'success') {
          onSuccess && onSuccess(event.data);
        } else if (event.data.status === 'failed') {
          onFailure && onFailure(event.data);
        }
      }
      
      // Handle frame resize messages
      if (event.data && event.data.type === 'frame_height') {
        setFrameHeight(event.data.height);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onSuccess, onFailure]);

  // Handle iframe load event
  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  // If the modal is not open, don't render anything
  if (!isOpen) return null;

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <div className="payment-modal-header">
          <h2>Complete Your Payment</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="payment-modal-content">
          {isLoading && (
            <div className="payment-loading">
              <div className="spinner"></div>
              <p>Loading payment form...</p>
            </div>
          )}
          
          <iframe
            src={paymentUrl}
            title="Payment Form"
            className={`payment-iframe ${isLoading ? 'loading' : ''}`}
            onLoad={handleIframeLoad}
            height={frameHeight}
            allow="payment"
          ></iframe>
          
          {paymentStatus === 'success' && (
            <div className="payment-status success">
              <p>Payment completed successfully! Redirecting...</p>
            </div>
          )}
          
          {paymentStatus === 'failed' && (
            <div className="payment-status failed">
              <p>Payment failed. Please try again or contact support.</p>
            </div>
          )}
        </div>
        
        <div className="payment-modal-footer">
          <p>Secure payment powered by Lipia Online & M-Pesa</p>
          <button className="cancel-button" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
