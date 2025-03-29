import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PaymentModal from './PaymentModal';
import '../styles/PaymentForm.css';

// API URL - should come from environment in production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const PaymentForm = () => {
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [wordBalance, setWordBalance] = useState(null);
  
  const navigate = useNavigate();
  
  // Get auth token from localStorage
  const token = localStorage.getItem('token');
  
  // Fetch payment plans when component mounts
  useEffect(() => {
    fetchPlans();
    fetchWordBalance();
  }, []);
  
  // Fetch available payment plans
  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${API_URL}/payments/plans`);
      
      // Convert plans object to array for easier rendering
      const plansArray = Object.keys(response.data.plans).map(key => ({
        id: key,
        ...response.data.plans[key],
      }));
      
      setPlans(plansArray);
      
      // Set first plan as default selected
      if (plansArray.length > 0 && !selectedPlan) {
        setSelectedPlan(plansArray[0].id);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      setError('Unable to load payment plans. Please try again later.');
    }
  };
  
  // Fetch user's word balance
  const fetchWordBalance = async () => {
    if (!token) return;
    
    try {
      const response = await axios.get(`${API_URL}/words/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setWordBalance(response.data);
    } catch (error) {
      console.error('Error fetching word balance:', error);
    }
  };
  
  // Handle plan selection
  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);
  };
  
  // Handle payment button click
  const handlePayNow = async () => {
    if (!selectedPlan) {
      setError('Please select a payment plan');
      return;
    }
    
    if (!token) {
      // Redirect to login if not authenticated
      navigate('/login', { state: { from: '/payment', plan: selectedPlan } });
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Initiate payment on the backend
      const response = await axios.post(
        `${API_URL}/payments/initiate`,
        { plan: selectedPlan },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Get payment URL with encoded parameters
      const paymentUrlResponse = await axios.get(
        `${API_URL}/payments/url?amount=${response.data.amount}&reference=${response.data.reference}`
      );
      
      setPaymentUrl(paymentUrlResponse.data.paymentUrl);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error initiating payment:', error);
      setError(
        error.response?.data?.message || 
        'Unable to process payment. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };
  
  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPaymentUrl('');
  };
  
  // Handle payment success
  const handlePaymentSuccess = (data) => {
    // Update word balance after successful payment
    fetchWordBalance();
    
    // Close modal after a short delay
    setTimeout(() => {
      setIsModalOpen(false);
      navigate('/payment/success', { 
        state: { 
          reference: data.reference,
          plan: plans.find(p => p.id === selectedPlan)
        } 
      });
    }, 2000);
  };
  
  // Handle payment failure
  const handlePaymentFailure = () => {
    // Close modal after a short delay
    setTimeout(() => {
      setIsModalOpen(false);
      navigate('/payment/failed');
    }, 2000);
  };
  
  return (
    <div className="payment-form-container">
      <h2>Select a Word Credit Package</h2>
      
      {wordBalance && (
        <div className="word-balance-info">
          <p>
            Your current balance: <strong>{wordBalance.remaining.toLocaleString()}</strong> words
          </p>
        </div>
      )}
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="payment-plans">
        {plans.map((plan) => (
          <div 
            key={plan.id}
            className={`payment-plan-option ${selectedPlan === plan.id ? 'selected' : ''}`}
            onClick={() => handlePlanSelect(plan.id)}
          >
            <input
              type="radio"
              id={`plan-${plan.id}`}
              name="payment-plan"
              checked={selectedPlan === plan.id}
              onChange={() => handlePlanSelect(plan.id)}
            />
            <label htmlFor={`plan-${plan.id}`}>
              <strong>{plan.name}</strong> - KES {plan.price.toLocaleString()}
              <div className="words-info">
                <span className="words-count">{plan.words.toLocaleString()}</span> words
              </div>
            </label>
          </div>
        ))}
      </div>
      
      <div className="form-actions">
        <button 
          className="btn btn-primary"
          onClick={handlePayNow}
          disabled={loading || !selectedPlan}
        >
          {loading ? 'Processing...' : 'Pay Now with M-Pesa'}
        </button>
      </div>
      
      <div className="payment-info">
        <p>Secure payment processing by Lipia Online. No credit card required!</p>
      </div>
      
      {/* Payment Modal */}
      <PaymentModal
        isOpen={isModalOpen}
        paymentUrl={paymentUrl}
        onClose={handleCloseModal}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
      />
    </div>
  );
};

export default PaymentForm;
