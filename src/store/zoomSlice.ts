import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ZoomLevel } from '../utils/zoomUtils'; // Assurez-vous que ZoomLevel est bien exporté depuis ce fichier
import { RootState } from './index'; // Importer RootState pour le sélecteur

interface ZoomState {
  selectedZoom: ZoomLevel;
}

const initialState: ZoomState = {
  selectedZoom: 'Fit to screen', // Default zoom level
};

const zoomSlice = createSlice({
  name: 'zoom',
  initialState,
  reducers: {
    setZoomLevel(state, action: PayloadAction<ZoomLevel>) {
      state.selectedZoom = action.payload;
    },
    // Optionally add a reset action if needed
    // resetZoom(state) {
    //   state.selectedZoom = initialState.selectedZoom;
    // }
  },
});

export const { setZoomLevel } = zoomSlice.actions;

// Selector type explicit
export const selectSelectedZoom = (state: RootState): ZoomLevel => state.zoom.selectedZoom;

export default zoomSlice.reducer; // Exporter le reducer comme default 