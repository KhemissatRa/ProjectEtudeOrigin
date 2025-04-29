import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import Activity from '../types/Activity.ts';

interface ActivitiesState {
  activities: Activity[];
  activeActivityIds: string[];
}

const initialState: ActivitiesState = {
  activities: [],
  activeActivityIds: [],
};

const activitiesSlice = createSlice({
  name: 'activities',
  initialState,
  reducers: {
    addActivity: (state, action: PayloadAction<Activity | Activity[]>) => {
      const activitiesToAdd = Array.isArray(action.payload) ? action.payload : [action.payload];
      // Ajoute seulement les nouvelles activités uniques (vérifie par ID)
      const uniqueNewActivities = activitiesToAdd.filter(
        (newAct) => !state.activities.some((existingAct) => existingAct.id === newAct.id)
      );
      // Ajoute au début de la liste
      state.activities.unshift(...uniqueNewActivities);
      // Ne modifie PAS activeActivityIds ici
    },
    deleteActivity: (state, action: PayloadAction<string>) => {
      const activityIdToDelete = action.payload;
      state.activities = state.activities.filter((activity) => activity.id !== activityIdToDelete);
      // Retire aussi l'ID des actifs s'il y était
      state.activeActivityIds = state.activeActivityIds.filter(id => id !== activityIdToDelete);
    },
    clearActivities: (state) => {
      state.activities = [];
      state.activeActivityIds = []; // Vide aussi les actifs
    },
    // Action pour remplacer complètement les IDs actifs (peut être utile)
    setActiveActivityIds: (state, action: PayloadAction<string[]>) => {
      state.activeActivityIds = action.payload;
    },
    // NOUVELLE ACTION: Ajouter/Retirer un ID de la liste des actifs
    toggleActivityActive: (state, action: PayloadAction<string>) => {
        const idToToggle = action.payload;
        const index = state.activeActivityIds.indexOf(idToToggle);
        if (index === -1) {
            // Pas trouvé -> Ajouter
            state.activeActivityIds.push(idToToggle);
        } else {
            // Trouvé -> Retirer
            state.activeActivityIds.splice(index, 1);
        }
    },
  },
});

// Exporter la nouvelle action
export const {
    addActivity,
    deleteActivity,
    clearActivities,
    setActiveActivityIds,
    toggleActivityActive // <- Exporter la nouvelle action
} = activitiesSlice.actions;
export default activitiesSlice.reducer;