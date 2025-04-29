import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type Orientation = "Portrait" | "Landscape";

export interface LayoutTemplate {
  id: string;
}

// Mettre à jour avec les 12 layouts de l'image "majorfeat"
export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  { id: "layout-1" },
  { id: "layout-2" },
  { id: "layout-3" },
  { id: "layout-4" },
  { id: "layout-5" },
  { id: "layout-6" },
  { id: "layout-8" },
  { id: "layout-10" },
  { id: "layout-12" },
];

interface LayoutState {
  orientation: Orientation;
  selectedLayoutId: string;
  margins: {
    // Values represent scaling factor (0 to 0.2 for instance) or direct pixels
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  backgroundColor: string;
  border: {
    thickness: number; // in pixels
    color: string;
  };
}

const initialState: LayoutState = {
  orientation: "Portrait",
  selectedLayoutId: LAYOUT_TEMPLATES[0].id,
  margins: { top: 40, right: 40, bottom: 40, left: 40 }, // Default margin set to 40
  backgroundColor: "#FFFFFF",
  border: { thickness: 0, color: "#000000" },
};

const layoutSlice = createSlice({
  name: "layout",
  initialState,
  reducers: {
    setOrientation: (state, action: PayloadAction<Orientation>) => {
      state.orientation = action.payload;
    },
    setLayout: (state, action: PayloadAction<string>) => {
      if (LAYOUT_TEMPLATES.some((t) => t.id === action.payload)) {
        state.selectedLayoutId = action.payload;
      }
    },
    setMargin: (
      state,
      action: PayloadAction<{
        side: keyof LayoutState["margins"];
        value: number;
      }>
    ) => {
      const { side, value } = action.payload;
      state.margins[side] = Math.max(0, value); // Ensure non-negative
    },
    setMargins: (state, action: PayloadAction<LayoutState["margins"]>) => {
      state.margins = {
        top: Math.max(0, action.payload.top),
        right: Math.max(0, action.payload.right),
        bottom: Math.max(0, action.payload.bottom),
        left: Math.max(0, action.payload.left),
      };
    },
    setBackgroundColor: (state, action: PayloadAction<string>) => {
      state.backgroundColor = action.payload;
    },
    setBorderThickness: (state, action: PayloadAction<number>) => {
      state.border.thickness = Math.max(0, action.payload);
    },
    setBorderColor: (state, action: PayloadAction<string>) => {
      state.border.color = action.payload;
    },
    resetLayout: () => initialState,
    setLayoutState: (state, action: PayloadAction<LayoutState>) => {
      return action.payload;
    },
  },
});

export const {
  setOrientation,
  setLayout,
  setMargin,
  setMargins,
  setBackgroundColor,
  setBorderThickness,
  setBorderColor,
  resetLayout,
  setLayoutState,
} = layoutSlice.actions;

export default layoutSlice.reducer;
