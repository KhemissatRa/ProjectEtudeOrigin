import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CheckoutState {
  isProcessing: boolean;
  paymentSucceeded: boolean | null; // null = initial, true = success, false = failed
  error: string | null;
  lastSuccessfulExportTriggered: boolean; // Flag pour éviter double export
}

const initialState: CheckoutState = {
  isProcessing: false,
  paymentSucceeded: null,
  error: null,
  lastSuccessfulExportTriggered: false,
};

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    startPaymentProcessing: (state) => {
      state.isProcessing = true;
      state.paymentSucceeded = null;
      state.error = null;
      state.lastSuccessfulExportTriggered = false;
    },
    paymentSuccess: (state) => {
      state.isProcessing = false;
      state.paymentSucceeded = true;
      state.error = null;
    },
    paymentFailure: (state, action: PayloadAction<string>) => {
      state.isProcessing = false;
      state.paymentSucceeded = false;
      state.error = action.payload;
    },
    // Action déclenchée par EditorPreview après un export réussi post-paiement
    markExportAsTriggered: (state) => {
        if (state.paymentSucceeded) {
            state.lastSuccessfulExportTriggered = true;
        }
    },
    resetCheckoutState: () => initialState,
  },
});

export const {
  startPaymentProcessing,
  paymentSuccess,
  paymentFailure,
  markExportAsTriggered,
  resetCheckoutState,
} = checkoutSlice.actions;

export default checkoutSlice.reducer;