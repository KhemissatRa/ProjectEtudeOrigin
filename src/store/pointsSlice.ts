import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import Activity, { ActivityCoordinate } from '../types/Activity';

// Export explicite du type Point
export type Point = {
    id: string;
    activityId: string;
    type: 'startPoint' | 'finishPoint' | 'highestElevation' | 'lowestElevation';
    name: string;
    description?: string;
    coordinate?: ActivityCoordinate;
    isVisible: boolean;
    style: {
        color: string;
        textColor?: string;
        // ** Assurer que shape est défini **
        shape: 'circle' | 'triangle'; // Retiré le '?' pour le rendre obligatoire
        icon?: string;
    };
    position:
        | 'top-left'
        | 'top-center'
        | 'top-right'
        | 'center-left'
        | 'center'
        | 'center-right'
        | 'bottom-left'
        | 'bottom-center'
        | 'bottom-right';
};

interface PointsState {
    points: Point[];
    selectedPointId: string | null;
}

const initialState: PointsState = {
    points: [],
    selectedPointId: null,
};

const pointsSlice = createSlice({
    name: 'points',
    initialState,
    reducers: {
        initializePoints: (state, action: PayloadAction<Activity[]>) => {
            const activitiesToInitialize = action.payload;
            const activityIdsToInitialize = new Set(activitiesToInitialize.map(a => a.id));
            console.log('[initializePoints] Received activities:', Array.from(activityIdsToInitialize));

            // 1. Garder les points des activités NON initialisées
            const pointsToKeep = state.points.filter(p => !activityIdsToInitialize.has(p.activityId));
            console.log(`[initializePoints] Keeping ${pointsToKeep.length} points from other activities.`);

            // 2. Identifier les IDs des points existants pour les activités à initialiser
            const existingPointsFromInitializedActivities = state.points.filter(p => activityIdsToInitialize.has(p.activityId));
            const existingPointIds = new Set(existingPointsFromInitializedActivities.map(p => p.id));
            console.log(`[initializePoints] Found ${existingPointsFromInitializedActivities.length} existing points for activities to initialize.`);

            // 3. Créer les points potentiels SEULEMENT s'ils n'existent pas déjà
            const newlyAddedPoints: Point[] = []; // Points qui seront réellement ajoutés car manquants
            activitiesToInitialize.forEach((activity) => {
                console.log(`[initializePoints] Processing activity ${activity.id}, received pointsOfInterest:`, JSON.stringify(activity.pointsOfInterest, null, 2));
                if (activity.pointsOfInterest) {
                    Object.entries(activity.pointsOfInterest).forEach(([type, coordinate]) => {
                        if (coordinate && Array.isArray(coordinate) && coordinate.length >= 2 && isFinite(coordinate[0]) && isFinite(coordinate[1])) {
                            const id = `${activity.id}-${type}`;

                            // ---- AJOUT DE LA VÉRIFICATION ----
                            if (!existingPointIds.has(id)) {
                                const validCoords = coordinate.slice(0, 2) as [number, number];
                                const textColor = '#FFFFFF';
                                let pointData: Point | null = null;
                                // Créer pointData basé sur le type
                                switch (type) {
                                    case 'startPoint': pointData = { id, activityId: activity.id, type: 'startPoint', name: activity.startCity || "Start", description: '', coordinate: validCoords, isVisible: true, style: { color: '#34D399', textColor, shape: 'circle' }, position: 'top-left' }; break;
                                    case 'finishPoint': pointData = { id, activityId: activity.id, type: 'finishPoint', name: activity.finishCity || "Finish", description: '', coordinate: validCoords, isVisible: true, style: { color: '#F87171', textColor, shape: 'circle' }, position: 'bottom-right' }; break;
                                    case 'highestElevation': pointData = { id, activityId: activity.id, type: 'highestElevation', name: "Highest Point", description: '', coordinate: validCoords, isVisible: true, style: { color: '#60A5FA', textColor, shape: 'triangle' }, position: 'top-center' }; break;
                                    case 'lowestElevation': pointData = { id, activityId: activity.id, type: 'lowestElevation', name: "Lowest Point", description: '', coordinate: validCoords, isVisible: true, style: { color: '#FBBF24', textColor, shape: 'triangle' }, position: 'bottom-center' }; break;
                                    default: console.warn(`[initializePoints] Unknown point type: ${type}`);
                                }
                                if (pointData) {
                                    newlyAddedPoints.push(pointData);
                                    console.log(`[initializePoints] Point with id ${id} does not exist. Adding.`);
                                }
                            } else {
                                 console.log(`[initializePoints] Point with id ${id} already exists. Skipping creation.`);
                            }
                            // ---- FIN DE LA VÉRIFICATION ----
                        } else {
                             console.warn(`[initializePoints] Skipping point type '${type}' for activity '${activity.id}' due to missing/invalid coordinates:`, coordinate);
                        }
                    });
                } else {
                     console.warn(`[initializePoints] No pointsOfInterest found for activity '${activity.id}'`);
                }
            });

            // 4. Filtrer les NOUVEAUX points ajoutés pour unicité (basé sur coords)
            //    Note: Cela ne vérifie que les doublons PARMI les points nouvellement ajoutés.
            //    Si un nouveau point a les mêmes coords qu'un point existant (d'une autre activité ou même de celle-ci),
            //    il ne sera pas filtré ici. La logique pourrait être affinée si nécessaire.
            const uniqueNewlyAddedPoints = newlyAddedPoints.reduce((acc, current) => {
                const existing = acc.find(item =>
                    item.coordinate && current.coordinate &&
                    item.coordinate[0] === current.coordinate[0] &&
                    item.coordinate[1] === current.coordinate[1]
                );
                if (!existing) {
                    acc.push(current);
                } else {
                    console.log(`[initializePoints] Skipping duplicate among newly added points: ${current.name} (type: ${current.type}) duplicates ${existing.name} (type: ${existing.type})`);
                }
                return acc;
            }, [] as Point[]);

            // 5. Mettre à jour l'état en combinant les points gardés, les points existants préservés, et les nouveaux points uniques
            console.log(`[initializePoints] Updating state. Points kept from other activities: ${pointsToKeep.length}. Existing points preserved: ${existingPointsFromInitializedActivities.length}. Unique newly added points: ${uniqueNewlyAddedPoints.length}`);
            state.points = [...pointsToKeep, ...existingPointsFromInitializedActivities, ...uniqueNewlyAddedPoints];
            console.log(`[initializePoints] Final state points count: ${state.points.length}`);
        },
        addPoint: (state, action: PayloadAction<string>) => {
            const pointToAdd = state.points.find((point) => point.id === action.payload);
            if (pointToAdd) { pointToAdd.isVisible = true; }
        },
        setPointVisibility: (state, action: PayloadAction<{ id: string; isVisible: boolean }>) => {
            const pointToUpdate = state.points.find((point) => point.id === action.payload.id);
            if (pointToUpdate) { pointToUpdate.isVisible = action.payload.isVisible; }
        },
        setSelectedPointId: (state, action: PayloadAction<string | null>) => {
            state.selectedPointId = action.payload;
        },

        // ** REDUCER updatePoint ROBUSTE **
        updatePoint: (state, action: PayloadAction<{ id: string; updates: Partial<Omit<Point, 'style'>> & { style?: Partial<Point['style']> } }>) => {
            const pointIndex = state.points.findIndex((point) => point.id === action.payload.id);
            if (pointIndex !== -1) {
                const pointToUpdate = state.points[pointIndex];
                const { style: styleUpdates, ...otherUpdates } = action.payload.updates;
                const updatedStyle = {
                    ...(pointToUpdate.style || { shape: 'circle', color: '#000', textColor: '#FFF' }),
                    ...(styleUpdates || {}),
                };
                state.points[pointIndex] = {
                    ...pointToUpdate,
                    ...otherUpdates,
                    style: updatedStyle,
                };
            }
        },
        removePointsByActivityId: (state, action: PayloadAction<string>) => {
            state.points = state.points.filter(point => point.activityId !== action.payload);
             if (state.selectedPointId && !state.points.some(p => p.id === state.selectedPointId)) {
                state.selectedPointId = null;
            }
        },
        clearPoints: (state) => {
            state.points = [];
            state.selectedPointId = null;
        },
        setPointsState: (state, action: PayloadAction<PointsState>) => {
            return action.payload;
        },
    },
});

export const {
    initializePoints, addPoint, setPointVisibility, setSelectedPointId,
    updatePoint, removePointsByActivityId, clearPoints, setPointsState,
} = pointsSlice.actions;

export default pointsSlice.reducer;