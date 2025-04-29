import { createSlice } from "@reduxjs/toolkit";

interface SidebarState {
  open: boolean;
}

const initialState: SidebarState = {
  open: true,
};

const sidebarSlice = createSlice({
  name: "sidebar",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.open = !state.open;
    },
  },
});

export const { toggleSidebar } = sidebarSlice.actions;
export default sidebarSlice.reducer;