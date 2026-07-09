import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import { EventPage } from './pages/EventPage';
import { SeatMapPage } from './pages/SeatMapPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PaymentPage } from './pages/PaymentPage';
import { HomePage } from './pages/HomePage';
import { PaymentSuccessPage } from './pages/PaymentSuccessPage';
import { AuthProvider } from './context/AuthContext';

// Organizer Center
import { OrganizerLayout } from './pages/organizer-center/OrganizerLayout';
import { OrganizerDashboard } from './pages/organizer-center/Dashboard';
import { FilesPage } from './pages/organizer-center/FilesPage';
import { CreateStep1 } from './pages/organizer-center/CreateStep1';
import { CreateStep2 } from './pages/organizer-center/CreateStep2';
import { CreateStep3 } from './pages/organizer-center/CreateStep3';
import { CreateStep4 } from './pages/organizer-center/CreateStep4';

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
            <Route path="/payment-success.html" element={<PaymentSuccessPage />} />
            {/* Organizer Center */}
            <Route path="/organizer" element={<OrganizerLayout />}>
              <Route index element={<OrganizerDashboard />} />
              <Route path="files" element={<FilesPage />} />
              <Route path="create/step-1" element={<CreateStep1 />} />
              <Route path="create/step-2" element={<CreateStep2 />} />
              <Route path="create/step-3" element={<CreateStep3 />} />
              <Route path="create/step-4" element={<CreateStep4 />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </React.StrictMode>
  );
}
