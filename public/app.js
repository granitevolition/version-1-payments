// Payment Plans Data
const PAYMENT_PLANS = {
  basic: { id: 'basic', price: 1500, words: 30000, name: 'Basic Plan' },
  standard: { id: 'standard', price: 2500, words: 60000, name: 'Standard Plan' },
  premium: { id: 'premium', price: 4000, words: 100000, name: 'Premium Plan' }
};

// DOM Elements
const paymentPlansContainer = document.getElementById('paymentPlans');
const wordBalanceElement = document.getElementById('wordBalance');
const payNowButton = document.getElementById('payNowButton');
const paymentModal = document.getElementById('paymentModal');
const paymentIframe = document.getElementById('paymentIframe');
const closeModalButton = document.getElementById('closeModalButton');
const cancelPaymentButton = document.getElementById('cancelPaymentButton');

// Current state
let selectedPlan = null;
let wordBalance = 0;

// Initialize the application
function init() {
  // Load payment plans from API or use the static data
  fetchPaymentPlans();
  
  // Try to fetch user's word balance if logged in
  fetchWordBalance();
  
  // Set up event listeners
  payNowButton.addEventListener('click', handlePayNow);
  closeModalButton.addEventListener('click', closeModal);
  cancelPaymentButton.addEventListener('click', closeModal);
  paymentIframe.addEventListener('load', handleIframeLoaded);
  
  // Handle messages from iframe
  window.addEventListener('message', handleIframeMessage);
}

// Fetch payment plans from API
async function fetchPaymentPlans() {
  try {
    // Try to fetch from API
    const response = await fetch('/api/payments/plans');
    if (response.ok) {
      const data = await response.json();
      renderPaymentPlans(data.plans);
    } else {
      // Fallback to static data
      renderPaymentPlans(PAYMENT_PLANS);
    }
  } catch (error) {
    console.error('Error fetching payment plans:', error);
    // Fallback to static data
    renderPaymentPlans(PAYMENT_PLANS);
  }
}

// Fetch user's word balance if logged in
async function fetchWordBalance() {
  try {
    // Get token from local storage
    const token = localStorage.getItem('token');
    if (!token) {
      wordBalanceElement.textContent = '0';
      return;
    }
    
    const response = await fetch('/api/words/balance', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      wordBalance = data.remaining || 0;
      wordBalanceElement.textContent = wordBalance.toLocaleString();
    }
  } catch (error) {
    console.error('Error fetching word balance:', error);
    wordBalanceElement.textContent = '0';
  }
}

// Render payment plans to the page
function renderPaymentPlans(plans) {
  // Clear loading indicator
  paymentPlansContainer.innerHTML = '';
  
  // Convert to array if it's an object
  const plansArray = Array.isArray(plans) ? plans : Object.values(plans);
  
  // Create elements for each plan
  plansArray.forEach(plan => {
    const planElement = document.createElement('div');
    planElement.className = 'payment-plan-option';
    planElement.dataset.planId = plan.id;
    
    planElement.innerHTML = `
      <input 
        type="radio" 
        id="plan-${plan.id}" 
        name="payment-plan" 
        value="${plan.id}"
      />
      <label for="plan-${plan.id}">
        <strong>${plan.name}</strong> - KES ${plan.price.toLocaleString()}
        <div class="words-info">
          <span class="words-count">${plan.words.toLocaleString()}</span> words
        </div>
      </label>
    `;
    
    // Add click handler
    planElement.addEventListener('click', () => selectPlan(plan.id));
    
    paymentPlansContainer.appendChild(planElement);
  });
}

// Handle plan selection
function selectPlan(planId) {
  // Update selected plan
  selectedPlan = planId;
  
  // Update UI to show selected plan
  document.querySelectorAll('.payment-plan-option').forEach(el => {
    if (el.dataset.planId === planId) {
      el.classList.add('selected');
      el.querySelector('input').checked = true;
    } else {
      el.classList.remove('selected');
      el.querySelector('input').checked = false;
    }
  });
  
  // Enable pay button
  payNowButton.disabled = false;
}

// Handle Pay Now button click
async function handlePayNow() {
  if (!selectedPlan) {
    alert('Please select a payment plan');
    return;
  }
  
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    // Redirect to login
    window.location.href = '/login';
    return;
  }
  
  try {
    // Show loading state
    payNowButton.disabled = true;
    payNowButton.textContent = 'Processing...';
    
    // For demo purposes, create a direct URL
    // In a real app, you would initiate the payment on your backend
    const plan = PAYMENT_PLANS[selectedPlan];
    const paymentUrl = `https://lipia-online.vercel.app/link/andikar?amount=${plan.price}&reference=DEMO-${Date.now()}&callback=${encodeURIComponent(window.location.origin + '/api/payments/callback')}`;
    
    // Open payment modal
    openModal(paymentUrl);
  } catch (error) {
    console.error('Error initiating payment:', error);
    alert('Failed to initiate payment. Please try again.');
    
    // Reset button state
    payNowButton.disabled = false;
    payNowButton.textContent = 'Pay Now with M-Pesa';
  }
}

// Open payment modal with URL
function openModal(url) {
  // Set iframe source
  paymentIframe.src = url;
  paymentIframe.classList.add('loading');
  
  // Show modal
  paymentModal.style.display = 'flex';
  
  // Prevent page scrolling
  document.body.style.overflow = 'hidden';
}

// Close payment modal
function closeModal() {
  // Hide modal
  paymentModal.style.display = 'none';
  
  // Clear iframe
  paymentIframe.src = '';
  
  // Allow page scrolling
  document.body.style.overflow = '';
  
  // Reset button
  payNowButton.disabled = false;
  payNowButton.textContent = 'Pay Now with M-Pesa';
}

// Handle iframe loaded event
function handleIframeLoaded() {
  paymentIframe.classList.remove('loading');
}

// Handle messages from iframe
function handleIframeMessage(event) {
  // In a real implementation, you would validate the origin
  
  if (event.data && event.data.type === 'payment_status') {
    if (event.data.status === 'success') {
      // Show success message
      alert('Payment successful!');
      
      // Close modal after a short delay
      setTimeout(() => {
        closeModal();
        
        // Refresh word balance
        fetchWordBalance();
      }, 2000);
    } else if (event.data.status === 'failed') {
      // Show failure message
      alert('Payment failed. Please try again.');
      
      // Close modal after a short delay
      setTimeout(closeModal, 2000);
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
