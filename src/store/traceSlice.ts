import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TraceState {
  color: string;
  width: number; // en pixels
  opacity: number; // 0 à 1
  lineStyle: 'solid' | 'dashed' | 'dotted'; // Ajout du style de ligne
  lineCap: 'butt' | 'round' | 'square'; // Ajout de la terminaison de ligne
  lineJoin: 'bevel' | 'round' | 'miter'; // Ajout de la jonction de ligne
}

const initialState: TraceState = {
  color: '#FF0000', // Rouge par défaut
  width: 2, // 2px par défaut
  opacity: 1, // Pleinement opaque par défaut
  lineStyle: 'solid', // Style solide par défaut
  lineCap: 'round', // Terminaison arrondie par défaut
  lineJoin: 'round', // Jonction arrondie par défaut
};

const traceSlice = createSlice({
  name: 'trace',
  initialState,
  reducers: {
    setTraceColor: (state, action: PayloadAction<string>) => {
      state.color = action.payload;
    },
    setTraceWidth: (state, action: PayloadAction<number>) => {
      state.width = Math.max(0.5, Math.min(10, action.payload));
    },
    setTraceOpacity: (state, action: PayloadAction<number>) => {
      state.opacity = Math.max(0, Math.min(1, action.payload));
    },
    setTraceLineStyle: (state, action: PayloadAction<'solid' | 'dashed' | 'dotted'>) => {
      state.lineStyle = action.payload;
    },
    setTraceLineCap: (state, action: PayloadAction<'butt' | 'round' | 'square'>) => {
      state.lineCap = action.payload;
    },
    setTraceLineJoin: (state, action: PayloadAction<'bevel' | 'round' | 'miter'>) => {
      state.lineJoin = action.payload;
    },
    resetTraceStyle: () => initialState,
    setTraceState: (state, action: PayloadAction<TraceState>) => {
      return action.payload;
    },
  },
});

export const {
  setTraceColor,
  setTraceWidth,
  setTraceOpacity,
  setTraceLineStyle,
  setTraceLineCap,
  setTraceLineJoin,
  resetTraceStyle,
  setTraceState,
} = traceSlice.actions;

export default traceSlice.reducer;