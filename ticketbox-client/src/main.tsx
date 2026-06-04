import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import { EventPage } from './pages/EventPage';
import { SeatMapPage } from './pages/SeatMapPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PaymentPage } from './pages/PaymentPage';
import { HomePage } from './pages/HomePage';
import { AuthProvider } from './context/AuthContext';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/event.html" element={<EventPage />} />
            <Route path="/seat.html" element={<SeatMapPage />} />
            <Route path="/checkout.html" element={<CheckoutPage />} />
            <Route path="/payment.html" element={<PaymentPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </React.StrictMode>
  );
}
