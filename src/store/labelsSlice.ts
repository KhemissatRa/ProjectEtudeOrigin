import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const today = new Date().toLocaleDateString('fr-FR');

// Define possible text transform values
type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

// Common style interface
interface TextStyle {
    color: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: number; // Numeric CSS values: 100-900
    isItalic: boolean;
    textAlign: 'left' | 'center' | 'right' | 'justify';
    marginTop: number;
    marginBottom: number;
    textTransform: TextTransform;
}

// Stat style can also potentially use textTransform, fontWeight, color, etc.
interface LabelStat {
    label: string;
    value: string;
    style: Partial<TextStyle>; // Inherits possibilities, including color
}

interface LabelData {
    text: string;
    isVisible: boolean;
    style: TextStyle; // Uses the updated TextStyle
}

interface LabelsState {
    title: LabelData;
    description: LabelData;
    stats: LabelStat[];
}

const defaultTextStyle: TextStyle = {
    color: "#000000",
    fontSize: 36,
    fontFamily: "Oswald, sans-serif",
    fontWeight: 700, // Default title to Bold (700)
    isItalic: false,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 0,
    textTransform: 'uppercase',
};

// Default style for stats - Added default color
const defaultStatStyle: Partial<TextStyle> = {
    color: "#333333", // Default color for stats (dark gray)
    fontSize: 16,
    fontFamily: "Open Sans, sans-serif",
    fontWeight: 400, // Default stats to Normal (400)
    textTransform: 'none',
};

const initialState: LabelsState = {
    title: {
        text: "Titre",
        isVisible: true,
        style: { ...defaultTextStyle },
     },
    description: {
        text: "Description",
        isVisible: true,
        style: {
            ...defaultTextStyle,
            fontSize: 24,
            fontWeight: 300,
            marginBottom: 0,
            textTransform: 'uppercase',
        },
     },
    stats: [
        { label: "Date", value: today, style: { ...defaultStatStyle } }, // Inherits default color
        { label: "Distance", value: "0 KM", style: { ...defaultStatStyle } }, // Inherits default color
        { label: "Duration", value: "00:00:00", style: { ...defaultStatStyle } }, // Inherits default color
    ],
};

const labelsSlice = createSlice({
    name: "labels",
    initialState,
    reducers: {
        // --- Title ---
        setTitle: (state, action: PayloadAction<string>) => {
            state.title.text = action.payload;
        },
        setTitleVisibility: (state, action: PayloadAction<boolean>) => {
            state.title.isVisible = action.payload;
        },
        updateLabelStyle: (state, action: PayloadAction<{ labelType: 'title' | 'description'; updates: Partial<TextStyle>}>) => {
            const { labelType, updates } = action.payload;
            if (updates.fontWeight !== undefined && typeof updates.fontWeight === 'string') {
                updates.fontWeight = parseInt(updates.fontWeight, 10) || 400;
            }
            state[labelType].style = { ...state[labelType].style, ...updates };
        },
        // Legacy setters (can be removed if not used)
        setTitleSize: (state, action: PayloadAction<number>) => { state.title.style.fontSize = action.payload; },
        setTitleColor: (state, action: PayloadAction<string>) => { state.title.style.color = action.payload; },

        // --- Description ---
        setDescription: (state, action: PayloadAction<string>) => {
            state.description.text = action.payload;
        },
        setDescriptionVisibility: (state, action: PayloadAction<boolean>) => {
            state.description.isVisible = action.payload;
        },
        // Legacy setters (can be removed if not used)
        setDescriptionSize: (state, action: PayloadAction<number>) => { state.description.style.fontSize = action.payload; },
        setDescriptionColor: (state, action: PayloadAction<string>) => { state.description.style.color = action.payload; },

        // --- Stats ---
        addStat: (state, action: PayloadAction<{ label: string; value: string; style?: Partial<TextStyle> }>) => {
             // Ensures new stat gets the default style, including the default color
             const newStat: LabelStat = {
                label: action.payload.label,
                value: action.payload.value,
                style: { ...defaultStatStyle, ...(action.payload.style || {}) }
            };
            state.stats.push(newStat);
        },
        updateStat: (state, action: PayloadAction<{ index: number; label: string; value: string }>) => {
            const { index, label, value } = action.payload;
            if (index >= 0 && index < state.stats.length) {
                state.stats[index].label = label;
                state.stats[index].value = value;
            }
        },
        updateStatStyle: (state, action: PayloadAction<{ index: number; updates: Partial<TextStyle> }>) => {
             const { index, updates } = action.payload;
            if (index >= 0 && index < state.stats.length) {
                // Ensure style object exists before updating
                if (!state.stats[index].style) {
                    state.stats[index].style = { ...defaultStatStyle };
                }
                // Ensure fontWeight is treated as a number if provided as string potentially
                if (updates.fontWeight !== undefined && typeof updates.fontWeight === 'string') {
                    updates.fontWeight = parseInt(updates.fontWeight, 10) || 400;
                }
                // Merge updates, including potential 'color' update
                state.stats[index].style = { ...state.stats[index].style, ...updates };
            }
        },
        removeStat: (state, action: PayloadAction<number>) => {
            state.stats.splice(action.payload, 1);
        },
        reorderStat: (state, action: PayloadAction<{ startIndex: number; endIndex: number }>) => {
            const { startIndex, endIndex } = action.payload;
            const result = Array.from(state.stats);
            const [removed] = result.splice(startIndex, 1);
            result.splice(endIndex, 0, removed);
            state.stats = result;
        },
        setLabelsState: (state, action: PayloadAction<LabelsState>) => {
            return action.payload;
        },
        // Reset everything
        initializeLabels: () => initialState,
    },
});

export const {
    setTitle,
    setTitleVisibility,
    setDescription,
    setDescriptionVisibility,
    updateLabelStyle,
    updateStatStyle, // Handles stat style updates, including color
    addStat,
    updateStat,
    removeStat,
    reorderStat,
    setLabelsState,
    initializeLabels,
    // Legacy actions (consider removing if unused)
    setTitleSize,
    setTitleColor,
    setDescriptionSize,
    setDescriptionColor,
} = labelsSlice.actions;

export default labelsSlice.reducer;