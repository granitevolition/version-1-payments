import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PaymentProvider } from './context/PaymentContext';
import PaymentForm from './components/payment/PaymentForm';
import PaymentCallback from './pages/PaymentCallback';
import './App.css';

/**
 * Main App Component
 * Sets up routing and payment context
 */
function App() {
  return (
    <PaymentProvider>
      <Router>
        <div className="app-container">
          <header className="app-header">
            <h1>Andikar AI Payments</h1>
            <p className="app-subtitle">Purchase word credits for AI content generation</p>
          </header>
          
          <main className="app-main">
            <Routes>
              <Route path="/" element={<PaymentForm />} />
              <Route path="/payment/callback" element={<PaymentCallback />} />
            </Routes>
          </main>
          
          <footer className="app-footer">
            <p>&copy; {new Date().getFullYear()} Andikar AI. All rights reserved.</p>
            <p className="app-footer-links">
              <a href="/terms">Terms</a> &bull; <a href="/privacy">Privacy</a>
            </p>
          </footer>
        </div>
      </Router>
    </PaymentProvider>
  );
}

export default App;