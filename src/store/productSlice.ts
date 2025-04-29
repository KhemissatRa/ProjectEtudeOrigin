import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Types de produits
export type ProductType = 'Poster' | 'Framed poster';

// Tailles de papier (avec dimensions physiques pour référence, même si non utilisées directement pour le rendu)
export interface PaperSize {
  id: string;
  name: string; // e.g., 'A4', '30x40cm'
  dimensions: string; // e.g., '21 x 29.7 cm'
  basePriceModifier?: number; // Modificateur de prix par rapport au prix de base du produit
  // Dimensions de rendu (utilisées dans EditorPreview) - Assurez le ratio
  renderWidth: number;
  renderHeight: number;
}

// Couleurs de cadre
export interface FrameColor {
  id: string;
  name: string; // e.g., 'Natural', 'Black'
  colorValue: string; // Code couleur CSS (peut être utilisé pour un aperçu)
  priceModifier?: number;
}

// Finitions papier
export interface PaperFinish {
  id: string;
  name: string; // e.g., 'Matte', 'Semi-glossy'
  priceModifier?: number;
}

// Poids papier
export interface PaperWeight {
  id: string;
  name: string; // e.g., 'Premium', 'Museum'
  description: string; // e.g., '200 gsm'
  priceModifier: number; // Modificateur de prix (peut être 0 pour le standard)
}

// --- Options disponibles (Exemple - À remplir avec vos vraies données/prix) ---

export const PRODUCT_TYPES_CONFIG: { [key in ProductType]: { basePrice: number } } = {
  'Poster': { basePrice: 9 },
  'Framed poster': { basePrice: 9 }, // Forcer aussi à 9€ si jamais utilisé
};

// IMPORTANT: Assurez-vous que les renderWidth/Height correspondent au ratio des dimensions réelles
export const PAPER_SIZES: PaperSize[] = [
  { id: 'a4', name: 'A4', dimensions: '21 x 29.7 cm', basePriceModifier: 0, renderWidth: 595.2, renderHeight: 841.92 }, // Ratio ~0.707 (Basé sur 21x29.7cm @ 72dpi)
  { id: 'a3', name: 'A3', dimensions: '29.7 x 42 cm', basePriceModifier: 10, renderWidth: 841.92, renderHeight: 1190.64 }, // Ratio ~0.707
  { id: 'a2', name: 'A2', dimensions: '42 x 59.4 cm', basePriceModifier: 20, renderWidth: 1189.2, renderHeight: 1686 }, // Ratio ~0.707 - Added
  { id: 'a1', name: 'A1', dimensions: '59.4 x 84.1 cm', basePriceModifier: 40, renderWidth: 1686, renderHeight: 2384.4 }, // Ratio ~0.706 - Added
  { id: 'a0', name: 'A0', dimensions: '84.1 x 118.9 cm', basePriceModifier: 40, renderWidth: 2384.4, renderHeight: 3370.32 }, // Ratio ~0.707 - Added
  { id: '30x40', name: '30 x 40 cm', dimensions: '30 x 40 cm', basePriceModifier: 10, renderWidth: 850.32, renderHeight: 1133.76 }, // Updated ratio 0.75 (3/4)
  { id: '40x50', name: '40 x 50 cm', dimensions: '40 x 50 cm', basePriceModifier: 20, renderWidth: 1133.76, renderHeight: 1417.44 }, // Updated ratio 0.8 (4/5)
  { id: '40x60', name: '40 x 60 cm', dimensions: '40 x 60 cm', basePriceModifier: 20, renderWidth: 1133.76, renderHeight: 1700.88 }, // Ratio 0.667 (2/3) - Added
  { id: '50x70', name: '50 x 70 cm', dimensions: '50 x 70 cm', basePriceModifier: 30, renderWidth: 1417.44, renderHeight: 1984.32 },// Ratio ~0.714 (5/7) - Updated
  { id: '60x80', name: '60 x 80 cm', dimensions: '60 x 80 cm', basePriceModifier: 40, renderWidth: 1700.88, renderHeight: 2267.76 }, // Ratio 0.75 (3/4) - Updated
  { id: '60x90', name: '60 x 90 cm', dimensions: '60 x 90 cm', basePriceModifier: 40, renderWidth: 1700.88, renderHeight: 2551.2 },// Ratio 0.667 (2/3) - Updated
  { id: '70x100', name: '70 x 100 cm', dimensions: '70 x 100 cm', basePriceModifier: 40, renderWidth: 1984.32, renderHeight: 2834.64 },// Ratio 0.7 (7/10) - Updated
];


export const FRAME_COLORS: FrameColor[] = [
  { id: 'natural', name: 'Natural', colorValue: '#E0C9A6', priceModifier: 0 },
  { id: 'white', name: 'White', colorValue: '#FFFFFF', priceModifier: 0 },
  { id: 'black', name: 'Black', colorValue: '#000000', priceModifier: 0 },
  { id: 'dark', name: 'Dark', colorValue: '#5C3A21', priceModifier: 0 }, // Brun foncé
];

export const PAPER_FINISHES: PaperFinish[] = [
  { id: 'matte', name: 'Matte', priceModifier: 0 },
  { id: 'semi-glossy', name: 'Semi-glossy', priceModifier: 2 }, // Example price modifier
];

export const PAPER_WEIGHTS: PaperWeight[] = [
  { id: 'premium', name: 'Premium', description: '200 gsm', priceModifier: 0 },
  { id: 'museum', name: 'Museum', description: '250 gsm', priceModifier: 6 },
];


interface ProductState {
  productType: ProductType;
  selectedPaperSizeId: string;
  selectedFrameColorId: string | null; // Null si le produit n'est pas encadré
  selectedPaperFinishId: string;
  selectedPaperWeightId: string;
  currentPrice: number;
}

// --- Fonction pour calculer le prix ---
const calculatePrice = (state: Omit<ProductState, 'currentPrice'>): number => {
  const productConfig = PRODUCT_TYPES_CONFIG[state.productType];
  const paperSize = PAPER_SIZES.find(s => s.id === state.selectedPaperSizeId);
  const frameColor = state.selectedFrameColorId ? FRAME_COLORS.find(f => f.id === state.selectedFrameColorId) : null;
  const paperFinish = PAPER_FINISHES.find(f => f.id === state.selectedPaperFinishId);
  const paperWeight = PAPER_WEIGHTS.find(w => w.id === state.selectedPaperWeightId);

  let price = productConfig?.basePrice ?? 0;

  // Apply modifiers relative to the base price of the selected product type
  price += paperSize?.basePriceModifier ?? 0;

  if (state.productType === 'Framed poster' && frameColor?.priceModifier) {
    price += frameColor.priceModifier;
  }
  if (paperFinish?.priceModifier) {
    price += paperFinish.priceModifier;
  }
  if (paperWeight?.priceModifier) {
    price += paperWeight.priceModifier;
  }

  // Ensure minimum price based on product type's base price
  price = Math.min(price, productConfig?.basePrice ?? 0);

  return parseFloat(price.toFixed(2));
};


// --- State Initial ---
const initialProductState: Omit<ProductState, 'currentPrice'> = {
  productType: 'Framed poster', // Default
  selectedPaperSizeId: 'a3', // Toujours A3
  selectedFrameColorId: FRAME_COLORS[0].id,
  selectedPaperFinishId: PAPER_FINISHES[0].id,
  selectedPaperWeightId: PAPER_WEIGHTS[0].id,
};

const initialState: ProductState = {
    ...initialProductState,
    currentPrice: calculatePrice(initialProductState),
};


// --- Slice ---
const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    setProductType: (state, action: PayloadAction<ProductType>) => {
      state.productType = action.payload;
      if (state.productType === 'Poster') {
        state.selectedFrameColorId = null;
      } else if (!state.selectedFrameColorId) {
        state.selectedFrameColorId = FRAME_COLORS[0].id;
      }
      state.currentPrice = calculatePrice(state);
    },
    setPaperSize: (state, action: PayloadAction<string>) => {
      state.selectedPaperSizeId = 'a3'; // Toujours A3, ignorer la valeur reçue
      state.currentPrice = calculatePrice(state);
    },
    setFrameColor: (state, action: PayloadAction<string>) => {
       if (state.productType === 'Framed poster' && FRAME_COLORS.some(f => f.id === action.payload)) {
            state.selectedFrameColorId = action.payload;
            state.currentPrice = calculatePrice(state);
      }
    },
    setPaperFinish: (state, action: PayloadAction<string>) => {
      if (PAPER_FINISHES.some(f => f.id === action.payload)) {
        state.selectedPaperFinishId = action.payload;
        state.currentPrice = calculatePrice(state);
      }
    },
    setPaperWeight: (state, action: PayloadAction<string>) => {
      if (PAPER_WEIGHTS.some(w => w.id === action.payload)) {
        state.selectedPaperWeightId = action.payload;
        state.currentPrice = calculatePrice(state);
      }
    },
    resetProductConfiguration: () => initialState,
  },
});

export const {
  setProductType,
  setPaperSize,
  setFrameColor,
  setPaperFinish,
  setPaperWeight,
  resetProductConfiguration,
} = productSlice.actions;

export default productSlice.reducer;