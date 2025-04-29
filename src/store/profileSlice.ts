import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type GradientLength = 'S' | 'M' | 'L';
export type ProfileStyle = 'area' | 'line'; // Removed 'bars' for simplicity based on example

interface ProfileState {
  isVisible: boolean;
  style: ProfileStyle;
  color: string;
  showGradient: boolean; // Note: Recharts Area doesn't easily support complex gradients
  gradientLength: GradientLength; // Might affect opacity or a secondary color if implemented
  showGradientEffect: boolean;
  showAxis: boolean;
  chartHeight: number;
}

const initialState: ProfileState = {
  isVisible: true,
  style: 'area',
  color: '#0D0D0D', // Default dark color from example
  showGradient: false,
  gradientLength: 'M',
  showGradientEffect: true,
  showAxis: false, // Axes hidden in example
  chartHeight: 80, // Default height in px
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfileVisibility: (state, action: PayloadAction<boolean>) => {
      state.isVisible = action.payload;
    },
    setProfileStyle: (state, action: PayloadAction<ProfileStyle>) => {
      state.style = action.payload;
    },
    setProfileColor: (state, action: PayloadAction<string>) => {
      state.color = action.payload;
    },
    setShowGradient: (state, action: PayloadAction<boolean>) => {
      state.showGradient = action.payload;
    },
    setGradientLength: (state, action: PayloadAction<GradientLength>) => {
      state.gradientLength = action.payload;
    },
    setShowGradientEffect: (state, action: PayloadAction<boolean>) => {
      state.showGradientEffect = action.payload;
    },
    setShowAxis: (state, action: PayloadAction<boolean>) => {
      state.showAxis = action.payload;
    },
    setChartHeight: (state, action: PayloadAction<number>) => {
      state.chartHeight = action.payload;
    },
    resetProfileSettings: () => initialState,
    setProfileState: (state, action: PayloadAction<ProfileState>) => {
      return action.payload;
    },
  },
});

export const {
  setProfileVisibility,
  setProfileStyle,
  setProfileColor,
  setShowGradient,
  setGradientLength,
  setShowGradientEffect,
  setShowAxis,
  setChartHeight,
  resetProfileSettings,
  setProfileState,
} = profileSlice.actions;

export default profileSlice.reducer;