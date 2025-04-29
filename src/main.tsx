// src/main.tsx
import './index.css'
import App from './App.tsx'
import { store, persistor } from './store';
import { StrictMode } from 'react'
import { Provider } from 'react-redux';
import { createRoot } from 'react-dom/client'
import 'react-tooltip/dist/react-tooltip.css'
import { BrowserRouter } from "react-router-dom";
import { PersistGate } from 'redux-persist/integration/react';
import Spinner from './components/Spinner';

// --- Stripe ---
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Mettez votre clé publique Stripe ici (utilisez une variable d'environnement)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={<div className="flex h-screen w-screen items-center justify-center"><Spinner /></div>} persistor={persistor}>
        <BrowserRouter>
          {/* Envelopper l'application avec Stripe Elements */}
          <Elements stripe={stripePromise}>
            <App />
          </Elements>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </StrictMode>
)