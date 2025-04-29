import { FeatureCollection } from "geojson";
import Activity, { ActivityCoordinate } from "../types/Activity";

// Helper function to convert ArrayBuffer to Hex String
const bufferToHex = (buffer: ArrayBuffer): string => {
  return Array.prototype.map
    .call(new Uint8Array(buffer), (x) => ("00" + x.toString(16)).slice(-2))
    .join("");
};

// Helper function to calculate SHA-256 hash of a string
const sha256 = async (str: string): Promise<string> => {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return bufferToHex(hashBuffer);
};

// Fonction utilitaire pour calculer la distance entre deux points (Formule de Haversine)
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Rayon de la Terre en mètres
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ en radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance en mètres
};

// Fonction reverseGeocode (inchangée)
const reverseGeocode = async (lon: number, lat: number): Promise<string> => {
    // ... (garder le code existant de reverseGeocode)
    if (!isFinite(lon) || !isFinite(lat)) {
        console.warn("Invalid coords for reverse geocoding:", lon, lat);
        return "Unknown";
    }
    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    if (!accessToken) {
        console.error("Mapbox Access Token is missing!");
        return "Unknown (No Token)";
    }
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${accessToken}&types=place&language=fr`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
        let errorMsg = `Reverse geocoding failed status ${response.status}`;
        try {
            const errorBody = await response.json();
            errorMsg += `: ${errorBody.message || "Unknown Mapbox error"}`;
        } catch (_) {}
        console.error(errorMsg);
        return "Unknown (API Error)";
        }
        const data = await response.json();
        const cityFeature = data.features.find((f: any) =>
        f.place_type.includes("place")
        );
        const localityFeature = data.features.find((f: any) =>
        f.place_type.includes("locality")
        );
        return cityFeature?.text || localityFeature?.text || "Unknown";
    } catch (error: any) {
        console.error("Reverse geocoding fetch error:", error.message || error);
        return "Unknown (Fetch Error)";
    }
};

// --- Fonction principale handleFileUpload (AVEC HASH POUR ID UNIQUE) ---
export const handleFileUpload = async (
  event: React.ChangeEvent<HTMLInputElement>,
  existingActivities: Activity[]
): Promise<Activity[]> => {
  const files = event.target.files;
  if (!files || files.length === 0) return [];

  // Utiliser l'ID basé sur le hash pour la vérification des doublons
  const existingActivityIds = new Set(existingActivities.map((a) => a.id));

  const activityPromises = Array.from(files).map(
    async (file): Promise<Activity | null> => {
      console.log(`Processing file: ${file.name}`);
      const fileNameWithoutExt = file.name.replace(/\.(gpx|kml)$/i, "");
      let fileContent: string;
      try {
        fileContent = await file.text();
      } catch (readError) {
        console.error(`Error reading file ${file.name}:`, readError);
        return null; // Skip file if reading fails
      }

      // *** NOUVEAU : Calculer le hash du contenu du fichier ***
      let fileHash: string;
      try {
        fileHash = await sha256(fileContent);
      } catch (hashError) {
        console.error(`Error hashing file ${file.name}:`, hashError);
        return null; // Skip file if hashing fails
      }
      const uniqueIdentifier = `local-${fileHash}`; // Utiliser le hash pour l'ID

      // *** NOUVEAU : Vérifier si cet ID existe déjà AVANT de parser ***
      if (existingActivityIds.has(uniqueIdentifier)) {
          console.log(`Skipping duplicate file based on content hash: ${file.name} (ID: ${uniqueIdentifier})`);
          return null; // Déjà présent, on ne le traite pas
      }
      // --- Fin des nouvelles vérifications ---

      let trace: FeatureCollection | undefined = undefined;
      let pointsOfInterest: Activity["pointsOfInterest"] = {};
      let startCity = "Unknown",
        finishCity = "Unknown";
      let activityDate: string | undefined = undefined;
      let totalDistance: number = 0;
      let duration: number = 0;
      let startTime: Date | null = null;
      let endTime: Date | null = null;

      if (file.name.toLowerCase().endsWith(".gpx")) {
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(fileContent, "text/xml"); // Utiliser fileContent ici
          const parserError = xmlDoc.querySelector("parsererror");
          if (parserError) {
            throw new Error(`GPX parsing error: ${parserError.textContent}`);
          }

          // ... (le reste du parsing GPX reste identique) ...
          activityDate =
            xmlDoc.querySelector("metadata > time")?.textContent ?? undefined;
          if (!activityDate) {
            const firstTrkptTime =
              xmlDoc.querySelector("trkpt > time")?.textContent;
            activityDate = firstTrkptTime || undefined;
          }
          // ... etc ...
          const trkpts = Array.from(xmlDoc.getElementsByTagName("trkpt"));
          console.log(`Found ${trkpts.length} trackpoints in ${file.name}`);

          let previousLat = NaN;
          let previousLon = NaN;

          const coordinates: ActivityCoordinate[] = trkpts
            .map((trkpt, index) => {
              const latAttr = trkpt.getAttribute("lat");
              const lonAttr = trkpt.getAttribute("lon");
              const eleEl = trkpt.getElementsByTagName("ele")[0];
              const eleText = eleEl?.textContent;

              const lat = latAttr ? parseFloat(latAttr) : NaN;
              const lon = lonAttr ? parseFloat(lonAttr) : NaN;
              const ele = eleText ? parseFloat(eleText) : NaN;

              if (isFinite(lon) && isFinite(lat)) {
                const coord: ActivityCoordinate = isFinite(ele)
                  ? [lon, lat, ele]
                  : [lon, lat];

                if (
                  index > 0 &&
                  isFinite(previousLat) &&
                  isFinite(previousLon)
                ) {
                  const segmentDistance = calculateDistance(
                    previousLat,
                    previousLon,
                    lat,
                    lon
                  );
                  totalDistance += segmentDistance;
                }
                previousLat = lat;
                previousLon = lon;

                return coord;
              } else {
                return null;
              }
            })
            .filter((coord): coord is ActivityCoordinate => coord !== null);

            // --- Calcul durée et distance ---
            if (activityDate) {
                try {
                  startTime = new Date(activityDate);
                  // Tentative de trouver la date/heure du dernier point
                  const lastTrkptTimeStr = trkpts.length > 0 ? trkpts[trkpts.length - 1].querySelector("time")?.textContent : null;
                  if (lastTrkptTimeStr) {
                      endTime = new Date(lastTrkptTimeStr);
                      if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime()) && endTime >= startTime) {
                          duration = (endTime.getTime() - startTime.getTime()) / 1000;
                           console.log(`Calculated duration from time tags: ${duration} seconds`);
                      } else {
                          console.warn(`Invalid or inconsistent time tags in ${file.name}, duration calculation might be inaccurate.`);
                           // Fallback: Simuler basé sur le nombre de points si les temps sont invalides
                           endTime = new Date(startTime.getTime() + coordinates.length * 1000); // 1 sec per point approx.
                           duration = (endTime.getTime() - startTime.getTime()) / 1000;
                           console.log(`Fallback duration calculation (approx): ${duration} seconds`);
                      }
                  } else {
                       // Fallback si pas de temps sur le dernier point
                       endTime = new Date(startTime.getTime() + coordinates.length * 1000); // 1 sec per point approx.
                       duration = (endTime.getTime() - startTime.getTime()) / 1000;
                       console.log(`Fallback duration calculation (no end time tag): ${duration} seconds`);
                  }
                } catch (e) {
                    console.error("Error parsing date/time for duration", activityDate, e);
                    startTime = null;
                    endTime = null;
                    duration = 0;
                }
            } else {
                console.warn(`Could not calculate duration: no activityDate found in ${file.name}`);
            }
            console.log(`Total calculated distance for ${file.name}: ${totalDistance.toFixed(2)} meters`);

          if (coordinates.length === 0) {
            console.warn(
              `No valid coordinates found in ${file.name}. Skipping.`
            );
            return null;
          }

          trace = {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: coordinates,
                },
                properties: {},
              },
            ],
          } as FeatureCollection;

          pointsOfInterest = {};

          if (
            coordinates.length > 0 &&
            coordinates[0] &&
            Array.isArray(coordinates[0]) &&
            coordinates[0].length >= 2 &&
            isFinite(coordinates[0][0]) &&
            isFinite(coordinates[0][1])
          ) {
            pointsOfInterest.startPoint = coordinates[0];
          }

          const lastCoord = coordinates[coordinates.length - 1];
          if (
            coordinates.length > 0 &&
            lastCoord &&
            Array.isArray(lastCoord) &&
            lastCoord.length >= 2 &&
            isFinite(lastCoord[0]) &&
            isFinite(lastCoord[1])
          ) {
            pointsOfInterest.finishPoint = lastCoord;
          }

          let minElevationCoord: ActivityCoordinate | undefined = undefined;
          let maxElevationCoord: ActivityCoordinate | undefined = undefined;
          let minEle = Infinity;
          let maxEle = -Infinity;

          coordinates.forEach((coord) => {
            const ele =
              coord.length === 3 &&
              typeof coord[2] === "number" &&
              isFinite(coord[2])
                ? coord[2]
                : NaN;
            if (!isNaN(ele)) {
              if (ele < minEle) {
                minEle = ele;
                minElevationCoord = coord;
              }
              if (ele > maxEle) {
                maxEle = ele;
                maxElevationCoord = coord;
              }
            }
          });

          if (minElevationCoord) pointsOfInterest.lowestElevation = minElevationCoord;
          if (maxElevationCoord) pointsOfInterest.highestElevation = maxElevationCoord;

          if (pointsOfInterest.startPoint && pointsOfInterest.finishPoint) {
            const [startLon, startLat] = pointsOfInterest.startPoint;
            const [finishLon, finishLat] = pointsOfInterest.finishPoint;
            if (
              isFinite(startLon) &&
              isFinite(startLat) &&
              isFinite(finishLon) &&
              isFinite(finishLat)
            ) {
              [startCity, finishCity] = await Promise.all([
                reverseGeocode(startLon, startLat),
                reverseGeocode(finishLon, finishLat),
              ]);
              console.log(
                `Geocoded cities for ${file.name}: Start=${startCity}, Finish=${finishCity}`
              );
            } else {
              console.warn(
                `Cannot geocode cities for ${file.name}: Invalid start/finish coordinates.`
              );
            }
          }
        } catch (gpxError: any) {
          console.error(
            `Error processing GPX file ${file.name}:`,
            gpxError.message || gpxError
          );
          return null;
        }
      } else if (file.name.toLowerCase().endsWith(".kml")) {
        console.warn(`KML parsing not implemented for ${file.name}.`);
        // Vous devriez implémenter le parsing KML ici de manière similaire au GPX
        // et vous assurer de calculer le hash et d'utiliser l'ID basé sur le hash
        // Pour l'instant, on retourne null pour éviter les doublons basé sur le nom/temps
        return null; // Pas encore supporté, et on ne veut pas d'ID aléatoire
      } else {
        console.warn(`Unsupported file type: ${file.name}.`);
        return null;
      }

      // Construction de l'objet Activity final
      const activity: Activity = {
        id: uniqueIdentifier, // Utilise l'ID basé sur le hash
        name: fileNameWithoutExt,
        source: "local",
        trace: trace as { // Type assertion ici pour plus de sécurité
          type: "FeatureCollection";
          features: {
            type: "Feature";
            geometry: {
              type: "LineString";
              coordinates: ActivityCoordinate[]; // S'assurer que c'est bien le type attendu
            };
            properties: {};
          }[];
        },
        pointsOfInterest: pointsOfInterest,
        startCity: startCity,
        finishCity: finishCity,
        date: activityDate || new Date().toISOString(),
        distance: totalDistance,
        duration: duration,
      };
      console.log(`Successfully processed ${file.name} into activity object.`);
      return activity;
    }
  );

  const results = await Promise.all(activityPromises);

  // Filtrer les nulls (erreurs, doublons, KML non supporté)
  const validActivities = results.filter(
    (activity): activity is Activity => activity !== null
  );

  // Cette vérification est maintenant redondante car faite plus tôt, mais on la garde par sécurité
  const uniqueNewActivities = validActivities.filter(
    (act) => !existingActivityIds.has(act.id)
  );

  // Réinitialiser le champ input pour permettre de re-sélectionner le même fichier (si nécessaire après suppression)
  event.target.value = "";
  console.log(
    `handleFileUpload returning ${uniqueNewActivities.length} new, unique activities.`
  );
  return uniqueNewActivities;
};