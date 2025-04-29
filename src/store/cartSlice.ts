import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store'; // Import RootState

// Définir ce qui constitue un élément du panier
export interface CartItem {
  id: string; // ID unique pour cet élément du panier (maintenant généré AVANT l'ajout)
  posterConfiguration: { // Snapshot de la configuration au moment de l'ajout
    labels: RootState['labels'];
    points: RootState['points']['points']; // Seulement les points, pas l'ID sélectionné
    layout: RootState['layout'];
    map: RootState['map'];
    trace: RootState['trace'];
    profile: RootState['profile'];
    product: Omit<RootState['product'], 'currentPrice'> & { price: number }; // Inclure le prix calculé
    activeActivityIds: RootState['activities']['activeActivityIds'];
     // Snapshot des données d'activité pour la prévisualisation / recréation
    activitiesData: RootState['activities']['activities'];
  };
  thumbnailUrl?: string; // Optionnel: URL d'une miniature générée (peut être complexe à générer)
  addedAt: string; // Timestamp ISO string
}

interface CartState {
  items: CartItem[];
}

const initialState: CartState = {
  items: [],
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // L'action attend maintenant l'ID directement
    addPosterToCart: (state, action: PayloadAction<{ id: string; configuration: CartItem['posterConfiguration']; thumbnailUrl?: string }>) => {
       const newItem: CartItem = {
        id: action.payload.id, // Utiliser l'ID fourni
        posterConfiguration: action.payload.configuration,
        thumbnailUrl: action.payload.thumbnailUrl,
        addedAt: new Date().toISOString(),
      };
      state.items.push(newItem);
    },
    removeFromCart: (state, action: PayloadAction<string>) => { // ID de l'item à supprimer
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    clearCart: (state) => {
      state.items = [];
    },
    // Action pour supprimer les items après un paiement réussi (exemple)
    removeItemsById: (state, action: PayloadAction<string[]>) => {
        state.items = state.items.filter(item => !action.payload.includes(item.id));
    }
  },
});

export const {
  addPosterToCart,
  removeFromCart,
  clearCart,
  removeItemsById,
} = cartSlice.actions;

export default cartSlice.reducer;