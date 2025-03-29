import React, { useState, useEffect } from 'react';
import { usePayment } from '../../context/PaymentContext';
import '../../App.css';

/**
 * Payment Form Component
 * Allows users to enter payment details and initiate payment
 */
const PaymentForm = () => {
  // State for form data
  const [formData, setFormData] = useState({
    phone: '',
    amount: '1500',
    description: ''
  });
  
  // State for validation errors
  const [validationErrors, setValidationErrors] = useState({});
  
  // State for user's current word balance
  const [wordBalance, setWordBalance] = useState(null);
  
  // Payment plan options
  const paymentPlans = [
    { amount: 1500, words: 30000, label: 'Basic Plan - 30,000 words (KES 1,500)' },
    { amount: 2500, words: 60000, label: 'Standard Plan - 60,000 words (KES 2,500)' },
    { amount: 4000, words: 100000, label: 'Premium Plan - 100,000 words (KES 4,000)' }
  ];
  
  // Get payment context
  const { 
    initiatePayment, 
    redirectToLipiaCheckout,
    loading,
    error,
    clearError
  } = usePayment();
  
  // Fetch user's word balance on component mount
  useEffect(() => {
    const fetchWordBalance = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) return;
        
        const response = await fetch(`/api/v1/words/user/${userId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setWordBalance(data.data.remaining_words);
        }
      } catch (error) {
        console.error('Failed to fetch word balance:', error);
      }
    };
    
    fetchWordBalance();
  }, []);

  /**
   * Handle form input changes
   * @param {Object} e - Event object
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Clear validation error when user types
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: '' });
    }
    
    // If error is set, clear it
    if (error) {
      clearError();
    }
    
    setFormData({ ...formData, [name]: value });
  };
  
  /**
   * Validate form inputs
   * @returns {boolean} Is form valid
   */
  const validateForm = () => {
    const errors = {};
    
    // Phone validation - must be a valid Kenyan number (07XXXXXXXX)
    const phoneRegex = /^0[17]\\d{8}$/;
    if (!formData.phone) {
      errors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phone)) {
      errors.phone = 'Please enter a valid Kenyan phone number (e.g., 0712345678)';
    }
    
    // Amount validation - must be one of the valid plan amounts
    if (!formData.amount) {
      errors.amount = 'Please select a plan';
    } else {
      const validAmounts = paymentPlans.map(plan => plan.amount.toString());
      if (!validAmounts.includes(formData.amount)) {
        errors.amount = 'Please select a valid plan';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  /**
   * Handle form submission
   * @param {Object} e - Event object
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    try {
      // Get user ID from localStorage
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }
      
      // Process 1: Initiate payment through our API
      const payment = await initiatePayment({
        phone: formData.phone,
        amount: formData.amount,
        user_id: userId,
        metadata: {
          description: formData.description
        }
      });
      
      console.log('Payment initiated:', payment);
      
      // Process 2: Redirect to Lipia checkout page with the same details
      redirectToLipiaCheckout(formData.phone, formData.amount);
      
      // Note: The redirect will navigate away from this page, so any code after
      // this point will not be executed unless the redirect fails
    } catch (err) {
      console.error('Payment initiation failed:', err);
      // Error handling is done by the context
    }
  };
  
  return (
    <div className="payment-form-container">
      <h2>Make Payment</h2>
      
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            type="text"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="07XXXXXXXX"
            className={validationErrors.phone ? 'input-error' : ''}
            disabled={loading}
          />
          {validationErrors.phone && (
            <div className="error-message">{validationErrors.phone}</div>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="amount">Select Payment Plan</label>
          <div className="payment-plans">
            {paymentPlans.map((plan) => (
              <div 
                key={plan.amount} 
                className={`payment-plan-option ${formData.amount === plan.amount.toString() ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  id={`plan-${plan.amount}`}
                  name="amount"
                  value={plan.amount}
                  checked={formData.amount === plan.amount.toString()}
                  onChange={handleChange}
                  disabled={loading}
                />
                <label htmlFor={`plan-${plan.amount}`}>
                  {plan.label}
                  <div className="words-info">
                    <span className="words-count">{plan.words.toLocaleString()}</span> words
                  </div>
                </label>
              </div>
            ))}
          </div>
          {validationErrors.amount && (
            <div className="error-message">{validationErrors.amount}</div>
          )}
        </div>
        
        {wordBalance !== null && (
          <div className="word-balance-info">
            <p>Current Word Balance: <strong>{wordBalance.toLocaleString()}</strong> words</p>
            <p>After purchase: <strong>
              {(wordBalance + parseInt(
                paymentPlans.find(
                  plan => plan.amount.toString() === formData.amount
                )?.words || 0
              )).toLocaleString()}
            </strong> words</p>
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="description">Description (Optional)</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="What is this payment for?"
            disabled={loading}
          />
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
        
        <div className="payment-info">
          <p>You will be redirected to M-Pesa to complete your payment.</p>
          <p>
            <small>
              Service provided by <strong>Lipia Online</strong>. 
              Standard M-Pesa charges may apply.
            </small>
          </p>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;