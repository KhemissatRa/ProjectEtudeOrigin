// src/store.ts
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from "redux-persist";
import storage from "redux-persist/lib/storage";

// Slices
import activitiesReducer from "./activitiesSlice";
import sidebarReducer from "./sidebarSlice";
import pointsReducer from "./pointsSlice";
import labelsReducer from "./labelsSlice";
import layoutReducer from "./layoutSlice";
import mapReducer from "./mapSlice";
import traceReducer from "./traceSlice";
import profileReducer from "./profileSlice";
import productReducer from "./productSlice";
import cartReducer from "./cartSlice";
import checkoutReducer from "./checkoutSlice"; // Ajouté
import zoomReducer from './zoomSlice'; // <-- Nouvelle importation
import overlayReducer from "./overlaySlice"; // <-- Nouvelle importation

const persistConfig = {
  key: "root",
  storage,
  // Persist cart items, maybe user preferences (like sidebar state)
  whitelist: ['activities', 'cart', 'sidebar', 'points', 'labels', 'layout', 'map', 'trace', 'profile', 'product', 'zoom', 'overlay'], // <-- Ajout de 'zoom' et 'overlay'
  // Optionally blacklist editor state if it shouldn't persist across sessions
  // blacklist: ['layout', 'map', 'trace', 'profile', 'product', 'points', 'labels', 'checkout']
};

const rootReducer = combineReducers({
  activities: activitiesReducer,
  sidebar: sidebarReducer,
  points: pointsReducer,
  labels: labelsReducer,
  layout: layoutReducer,
  map: mapReducer,
  trace: traceReducer,
  profile: profileReducer,
  product: productReducer,
  cart: cartReducer,
  checkout: checkoutReducer, // Ajouté
  zoom: zoomReducer, // <-- Nouveau reducer
  overlay: overlayReducer, // <-- Ajout overlay ici
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER, 'cart/addPosterToCart'], // Ignore addPosterToCart car il contient beaucoup de données non sérialisables
        ignoredPaths: ['cart.items'], // Ignore la vérification pour le contenu du panier
      },
      // Si toujours des problèmes:
      // serializableCheck: false,
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;