// src/utils/zoomUtils.ts

// Options de zoom disponibles (correspondant à celles dans Header.tsx)
export const ZOOM_OPTIONS = ["25%", "50%", "75%", "Fit to screen", "100%", "150%", "200%"] as const;
export type ZoomLevel = (typeof ZOOM_OPTIONS)[number];

// Interface pour les dimensions de base du poster
interface PosterDimensions {
  width: number;
  height: number;
}

// Interface pour les dimensions de la fenêtre (viewport)
interface ViewportDimensions {
  width: number;
  height: number;
}

// Fonction pour obtenir les dimensions de la fenêtre (viewport) avec ajustement pour h-screen - 61px
const getViewportDimensions = (heightOffset: number = 61): ViewportDimensions => {
  return {
    width: window.innerWidth,
    height: window.innerHeight - heightOffset, // h-screen - 61px
  };
};

// Fonction pour calculer l'échelle (scale) en fonction du niveau de zoom
export const calculateScale = (
  zoomLevel: ZoomLevel,
  baseDimensions: PosterDimensions,
  viewportPadding: number = 20, // Padding autour du poster pour "Fit to screen"
  heightOffset: number = 61 // Ajustement pour h-screen - 61px
): number => {
  if (zoomLevel === "Fit to screen") {
    const viewport = getViewportDimensions(heightOffset);
    const availableWidth = viewport.width - viewportPadding * 2;
    const availableHeight = viewport.height - viewportPadding * 2;

    // Prioriser la hauteur pour "Fit to screen"
    const heightRatio = availableHeight / baseDimensions.height;
    
    // Calculer le ratio de largeur pour vérifier si le poster rentre
    const widthRatio = availableWidth / baseDimensions.width;

    // Si la largeur dépasse l'espace disponible, ajuster en fonction de la largeur
    if (baseDimensions.width * heightRatio > availableWidth) {
      return widthRatio; // Ajuster en fonction de la largeur pour éviter le débordement
    }

    return heightRatio; // Ajuster en fonction de la hauteur pour remplir l'espace vertical
  }

  // Pour les pourcentages (25%, 50%, etc.), convertir en échelle décimale
  const percentage = parseInt(zoomLevel.replace("%", ""), 10);
  return percentage / 100;
};

// Fonction pour calculer les dimensions redimensionnées du poster
export const getScaledDimensions = (
  zoomLevel: ZoomLevel,
  baseDimensions: PosterDimensions,
  viewportPadding: number = 20,
  heightOffset: number = 61
): PosterDimensions => {
  const scale = calculateScale(zoomLevel, baseDimensions, viewportPadding, heightOffset);
  return {
    width: baseDimensions.width * scale,
    height: baseDimensions.height * scale,
  };
};

// Fonction pour calculer le padding redimensionné (proportionnel à l'échelle)
export const getScaledPadding = (
  basePadding: number,
  zoomLevel: ZoomLevel,
  baseDimensions: PosterDimensions,
  viewportPadding: number = 20,
  heightOffset: number = 61
): number => {
  const scale = calculateScale(zoomLevel, baseDimensions, viewportPadding, heightOffset);
  return basePadding * scale;
};

// Fonction pour calculer la taille de texte redimensionnée
export const getScaledFontSize = (
  baseFontSize: number, // Taille de base en pixels (ex: 48 pour un titre)
  zoomLevel: ZoomLevel,
  baseDimensions: PosterDimensions,
  viewportPadding: number = 20,
  heightOffset: number = 61
): number => {
  const scale = calculateScale(zoomLevel, baseDimensions, viewportPadding, heightOffset);
  return baseFontSize * scale;
};