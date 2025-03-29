import React, { useEffect, useRef } from 'react';
import './PaymentModal.css';

/**
 * Payment Modal Component
 * Creates a modal popup that embeds the Lipia payment form in an iframe
 * Handles postMessage communication with the iframe
 */
const PaymentModal = ({ 
  isOpen, 
  onClose, 
  phone, 
  amount, 
  onPaymentSuccess, 
  onPaymentFailure 
}) => {
  const iframeRef = useRef(null);
  const modalRef = useRef(null);

  // Close modal if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Set up message event listener for iframe communication
  useEffect(() => {
    const handleMessage = (event) => {
      // Verify the origin is from Lipia
      if (event.origin === 'https://lipia-online.vercel.app') {
        console.log('Received message from Lipia:', event.data);
        
        // Handle payment success
        if (event.data.status === 'success') {
          onPaymentSuccess(event.data);
        }
        
        // Handle payment failure
        if (event.data.status === 'failed') {
          onPaymentFailure(event.data);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onPaymentSuccess, onPaymentFailure]);

  // Construct the Lipia URL with parameters
  const getLipiaUrl = () => {
    const baseUrl = 'https://lipia-online.vercel.app/link/andikar';
    const params = new URLSearchParams();
    
    // Add phone and amount as query parameters if supported by Lipia
    if (phone) params.append('phone', phone);
    if (amount) params.append('amount', amount);
    
    // Add callback URL for Lipia to redirect back or send postMessage
    const callbackUrl = `${window.location.origin}/payment/callback`;
    params.append('callback_url', callbackUrl);
    
    // Add parameters for postMessage communication
    params.append('embed', 'true');
    params.append('postMessage', 'true');
    
    return `${baseUrl}?${params.toString()}`;
  };

  // Don't render anything if modal is closed
  if (!isOpen) return null;

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal-container" ref={modalRef}>
        <div className="payment-modal-header">
          <h3>Complete Your Payment</h3>
          <button 
            className="payment-modal-close" 
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        
        <div className="payment-modal-body">
          <iframe
            ref={iframeRef}
            src={getLipiaUrl()}
            title="Lipia Payment"
            className="payment-iframe"
            allow="payment"
            sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation allow-popups"
          />
        </div>
        
        <div className="payment-modal-footer">
          <p className="payment-modal-note">
            Secure payment powered by Lipia Online
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;