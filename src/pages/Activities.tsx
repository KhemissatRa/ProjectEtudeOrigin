import React, { useState, useEffect } from "react";
import { RootState } from "../store";
import { SiStrava } from "react-icons/si";
import { useDispatch, useSelector } from "react-redux";
import { handleFileUpload } from "../utils/fileUpload";
import { HiUpload, HiTrash, HiX } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import Spinner from "../components/Spinner";

import {
  addActivity,
  deleteActivity,
  clearActivities,
  setActiveActivityIds,
  toggleActivityActive,
} from "../store/activitiesSlice";
import { initializeLabels } from "../store/labelsSlice.ts";
import {
  initializePoints,
  removePointsByActivityId,
  clearPoints,
} from "../store/pointsSlice"; // Import clearPoints
import Activity from "../types/Activity";

import { updateStat } from "../store/labelsSlice";

const Activities = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const activities = useSelector(
    (state: RootState) => state.activities.activities || []
  );
  const activeActivityIds = useSelector(
    (state: RootState) => state.activities.activeActivityIds || []
  );
  const [isLoadingStrava, setIsLoadingStrava] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stravaClientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
  const stravaClientSecret = import.meta.env.VITE_STRAVA_CLIENT_SECRET;

  // Fonction pour obtenir l'URL de redirection correcte
  const getStravaRedirectUri = () => {
    // En production, utiliser l'URL de production définie dans les variables d'environnement
    if (import.meta.env.PROD) {
      return import.meta.env.VITE_STRAVA_REDIRECT_URI;
    }
    // En développement ou preview, utiliser l'URL actuelle
    return `${window.location.origin}/activities`;
  };

  const stravaRedirectUri = getStravaRedirectUri();

  console.log('Environment:', import.meta.env.MODE);
  console.log('Strava Redirect URI:', stravaRedirectUri);

  // --- Effet pour gérer le retour de l'authentification Strava ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    const storedState = localStorage.getItem("strava_temp_state");

    console.log('Code:', code);
    console.log('State:', state);
    console.log('Stored State:', storedState);
    console.log('Current URL:', window.location.href);

    if (code && state && state === storedState) {
      localStorage.removeItem("strava_temp_state");
      fetchStravaAccessToken(code);
      window.history.replaceState({}, document.title, "/activities");
    } else if (code && (!state || state !== storedState)) {
      setError("Erreur d’authentification Strava : état invalide.");
      localStorage.removeItem("strava_temp_state");
      window.history.replaceState({}, document.title, "/activities");
    }
  }, [dispatch, navigate, stravaClientId, stravaClientSecret]);

  // --- Initier l'authentification Strava ---
  const initiateStravaAuth = () => {
    const state = window.crypto.getRandomValues(new Uint8Array(16)).join("");
    localStorage.setItem("strava_temp_state", state);
    const scope = "activity:read_all";
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${stravaClientId}&redirect_uri=${encodeURIComponent(
      stravaRedirectUri
    )}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
    window.location.href = authUrl;
  };

  // --- Échanger le code d'autorisation contre un token d'accès ---
  const fetchStravaAccessToken = async (code: string) => {
    setIsLoadingStrava(true);
    setError(null);
    try {
      const response = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: stravaClientId,
          client_secret: stravaClientSecret,
          code: code,
          grant_type: "authorization_code",
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Erreur Strava ${response.status}: ${
            errorData.message || "Échec token"
          }`
        );
      }
      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem("strava_access_token", data.access_token);
        await fetchStravaActivities(data.access_token);
      } else {
        throw new Error("Token d’accès Strava non reçu.");
      }
    } catch (error: any) {
      console.error("Error fetchStravaAccessToken:", error);
      setError(`Erreur connexion Strava: ${error.message}`);
    } finally {
      setIsLoadingStrava(false);
    }
  };

  // --- Récupérer les activités depuis l'API Strava ---
  const fetchStravaActivities = async (accessToken: string) => {
    setIsLoadingStrava(true);
    setError(null);
    let page = 1;
    const perPage = 100;
    let allActivities: Activity[] = [];
    let hasMore = true;
    console.log("Starting Strava activity fetch...");

    try {
      while (hasMore) {
        const apiUrl = `https://www.strava.com/api/v3/athlete/activities?access_token=${accessToken}&per_page=${perPage}&page=${page}`;
        console.log(`Fetching Strava page ${page}...`);
        const response = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("strava_access_token");
            throw new Error("Token Strava invalide/expiré. Reconnectez-vous.");
          }
          const errorData = await response.json();
          throw new Error(
            `Erreur API Strava ${response.status}: ${
              errorData.message || "Échec fetch"
            }`
          );
        }
        const data = await response.json();

        if (data && Array.isArray(data)) {
          if (data.length === 0) {
            hasMore = false;
            console.log("No more activities on subsequent pages.");
            break;
          }
          console.log(`Fetched ${data.length} activities from page ${page}.`);

          const formattedActivitiesPromises = data.map(
            async (stravaActivity: any): Promise<Activity | null> => {
              if (
                !stravaActivity.id ||
                !stravaActivity.name ||
                !stravaActivity.start_date_local
              ) {
                console.warn(
                  "Skipping Strava activity due to missing essential data:",
                  stravaActivity
                );
                return null;
              }

              const coordinates = stravaActivity.map?.summary_polyline
                ? decodePolyline(stravaActivity.map.summary_polyline)
                : [];
              let pointsOfInterest: Activity["pointsOfInterest"] | undefined =
                undefined;
              let startCity: string | undefined = undefined;
              let finishCity: string | undefined = undefined;

              if (coordinates.length > 0) {
                const startPoint = coordinates[0];
                const finishPoint = coordinates[coordinates.length - 1];
                pointsOfInterest = { startPoint, finishPoint };
              }

              const activityObject: Activity = {
                id: `strava-${stravaActivity.id}`,
                name: stravaActivity.name,
                date: stravaActivity.start_date_local,
                distance:
                  typeof stravaActivity.distance === "number"
                    ? stravaActivity.distance
                    : undefined,
                duration:
                  typeof stravaActivity.moving_time === "number"
                    ? stravaActivity.duration
                    : undefined,
                source: "strava",
                stravaLink: `https://www.strava.com/activities/${stravaActivity.id}`,
                trace:
                  coordinates.length > 0
                    ? {
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
                      }
                    : undefined,
                pointsOfInterest: pointsOfInterest,
                startCity: startCity,
                finishCity: finishCity,
              };
              return activityObject;
            }
          );

          const resolvedActivities = (
            await Promise.all(formattedActivitiesPromises)
          ).filter((activity) => activity !== null) as Activity[];
          allActivities = [...allActivities, ...resolvedActivities];
          page++;
          if (page % 5 === 0)
            await new Promise((resolve) => setTimeout(resolve, 300));
        } else {
          throw new Error("Format de réponse Strava invalide.");
        }
      }

      console.log(
        `Fetched ${allActivities.length} total activities from Strava API.`
      );

      const existingStravaIds = new Set(
        activities.filter((act) => act.source === "strava").map((act) => act.id)
      );
      const newStravaActivities = allActivities.filter(
        (act) => !existingStravaIds.has(act.id)
      );

      if (newStravaActivities.length > 0) {
        console.log(
          `Dispatching ${newStravaActivities.length} new Strava activities to Redux...`
        );
        dispatch(addActivity(newStravaActivities));
        // Dispatch initializePoints for the new activities
        dispatch(initializePoints(newStravaActivities));
      } else {
        console.log("No new Strava activities found to add.");
      }
    } catch (error: any) {
      console.error("Erreur fetchStravaActivities:", error);
      setError(`Erreur Strava: ${error.message}`);
    } finally {
      setIsLoadingStrava(false);
    }
  };

  // --- Rafraîchir les activités Strava ---
  const refreshStravaActivities = () => {
    const accessToken = localStorage.getItem("strava_access_token");
    if (accessToken) {
      fetchStravaActivities(accessToken);
    } else {
      setError("Non connecté à Strava.");
    }
  };

  // --- Gérer l'upload de fichiers locaux ---
  const addActivitiesFromFiles = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    try {
      const newActivities = await handleFileUpload(event, activities);
      if (newActivities.length > 0) {
        console.log(`Dispatching ${newActivities.length} new activities from files...`);
        dispatch(addActivity(newActivities));
        dispatch(initializePoints(newActivities));
        // Activer automatiquement les nouvelles activités
        const newIds = newActivities.map(a => a.id);
        dispatch(setActiveActivityIds([...activeActivityIds, ...newIds]));
      }
    } catch (err: any) {
      console.error("Error processing uploaded files:", err);
      setError(`Erreur lors du chargement: ${err.message || err}`);
    }
  };

  // --- Supprimer une activité ---
  const handleDeleteActivity = (id: string) => {
    dispatch(deleteActivity(id));
    dispatch(removePointsByActivityId(id));
  };

  // --- Vider toutes les activités ---
  const handleClearActivities = () => {
    console.log("Clearing all activities and points...");
    dispatch(clearActivities());
    dispatch(clearPoints());
    dispatch(initializeLabels());
  };

  // --- Gérer la sélection/désélection d'activité ---
  const handleActivityClick = (id: string) => {
    const currentIndex = activeActivityIds.indexOf(id);
    let newActiveIds: string[];
    if (currentIndex === -1) {
      newActiveIds = [...activeActivityIds, id];
    } else {
      newActiveIds = activeActivityIds.filter((activeId) => activeId !== id);
    }
    dispatch(setActiveActivityIds(newActiveIds));
  };

  const activeActivities = Array.isArray(activities)
    ? activities.filter((activity) => activeActivityIds.includes(activity.id))
    : [];

  const totalDistance = activeActivities.reduce(
    (sum, act) =>
      sum +
      (typeof act.distance === "number" && isFinite(act.distance)
        ? act.distance
        : 0),
    0
  );

  const displayDistance =
    totalDistance > 0 ? `${(totalDistance / 1000).toFixed(2)} KM` : "0 KM";

  useEffect(() => {
    if (displayDistance !== "0 KM") {
      dispatch(
        updateStat({ index: 1, label: "Distance", value: displayDistance })
      );
    }
  }, [displayDistance, dispatch]);

  // --- Fonction utilitaire pour décoder les polylines ---
  const decodePolyline = (encoded: string): [number, number][] => {
    if (!encoded || typeof encoded !== "string") {
      return [];
    }
    let polyline: [number, number][] = [];
    let index = 0,
      len = encoded.length,
      lat = 0,
      lng = 0;
    try {
      while (index < len) {
        let b,
          shift = 0,
          result = 0;
        do {
          if (index >= len) throw new Error("Invalid polyline end");
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        let dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
        lat += dlat;
        shift = 0;
        result = 0;
        do {
          if (index >= len) throw new Error("Invalid polyline end");
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        let dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
        lng += dlng;
        polyline.push([lng / 1e5, lat / 1e5]);
      }
    } catch (e: any) {
      console.error("Error decoding polyline:", e.message);
      return [];
    }
    return polyline;
  };

  // --- Fonction utilitaire pour formater la durée ---
  const formatDisplayDuration = (seconds: number | undefined): string => {
    if (seconds === undefined || isNaN(seconds) || seconds < 0) return "N/A";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0)
      parts.push(`${String(m).padStart(h > 0 ? 2 : 1, "0")}m`);
    parts.push(`${String(s).padStart(2, "0")}s`);
    return parts.join(" ") || "0s";
  };

  // --- Fonction utilitaire pour formater la distance ---
  const formatDisplayDistance = (distance: number | undefined): string => {
    if (distance === undefined || isNaN(distance) || distance < 0) return "N/A";
    const km = distance / 1000;
    return `${km.toFixed(2)} km`;
  };

  // --- Formatage de la date pour l'affichage ---
  const formatDisplayDate = (dateString: string | undefined): string => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch (e) {
      return "N/A";
    }
  };

  // --- Rendu JSX ---
  return (
    <div className="space-y-6 p-4 md:p-6 max-w-md mx-auto md:max-w-none">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-lg font-semibold font-sans text-white">
          Activités
        </h1>
        <p className="text-gray-400 font-light text-sm">
          Importez vos activités ou connectez-vous à Strava.
        </p>
      </div>

      {/* Boutons d'action */}
      <div className="space-y-3">
        {!localStorage.getItem("strava_access_token") ? (
          <button
            onClick={initiateStravaAuth}
            disabled={isLoadingStrava}
            className="w-full text-sm flex justify-center items-center space-x-2 bg-[#FC4C02] hover:bg-[#e04402] text-white py-2.5 rounded-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {" "}
            <SiStrava className="w-5 h-5" /> <span>Se connecter à Strava</span>
          </button>
        ) : (
          <button
            onClick={refreshStravaActivities}
            disabled={isLoadingStrava}
            className="w-full text-sm flex justify-center items-center space-x-2 bg-[#FC4C02] hover:bg-[#e04402] text-white py-2.5 rounded-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {" "}
            <SiStrava className="w-5 h-5" />{" "}
            <span>Actualiser les activités Strava</span>
          </button>
        )}
        {isLoadingStrava && (
          <div className="flex justify-center my-4">
            <Spinner />
          </div>
        )}
        <div className="relative">
          <input
            id="file-upload"
            multiple
            type="file"
            accept=".gpx,.kml"
            onChange={addActivitiesFromFiles}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            aria-label="Importer des fichiers GPX ou KML"
          />
          <button
            type="button"
            className="w-full text-sm flex justify-center items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-md transition duration-150 ease-in-out"
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            {" "}
            <HiUpload className="w-5 h-5" /> <span>Importer GPX / KML</span>{" "}
          </button>
        </div>
        {activities.length > 0 && (
          <button
            onClick={handleClearActivities}
            className="w-full text-sm flex justify-center items-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-md transition duration-150 ease-in-out"
          >
            {" "}
            <HiTrash className="w-5 h-5" /> <span>Vider les activités</span>{" "}
          </button>
        )}
      </div>

      {/* Affichage d'erreur */}
      {error && (
        <div className="text-red-400 text-sm text-center p-2 bg-red-900/30 rounded-md">
          {error}
        </div>
      )}

      {/* Messages conditionnels */}
      {activities.length === 0 && !isLoadingStrava && (
        <div className="text-gray-500 text-sm text-center py-4">
          {" "}
          Aucune activité chargée. Importez un fichier ou connectez-vous à
          Strava.{" "}
        </div>
      )}
      {isLoadingStrava && activities.length === 0 && (
        <div className="flex justify-center items-center py-4">
          <span className="ml-2 text-gray-400 text-sm">
            Chargement des activités Strava...
          </span>{" "}
        </div>
      )}

      {/* Liste des activités */}
      {activities.length > 0 && (
        <>
          <hr className="border-gray-700" />
          <div className="flex flex-col space-y-2">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={`flex items-center space-x-3 py-2.5 px-3 rounded-md transition duration-150 ease-in-out cursor-pointer ${
                  activeActivityIds.includes(activity.id)
                    ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900 bg-gray-700/50"
                    : "hover:bg-gray-700/50"
                }`}
                onClick={() => handleActivityClick(activity.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  handleActivityClick(activity.id)
                }
              >
                <div className="flex-shrink-0 w-7 h-7 bg-gray-600 flex items-center justify-center rounded-sm text-gray-400">
                  {activity.source === "strava" ? (
                    <SiStrava className="w-4 h-4 text-[#FC4C02]" />
                  ) : (
                    <HiUpload className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <p
                      className="text-white font-medium text-sm truncate"
                      title={activity.name}
                    >
                      {activity.name || `Activité ${activity.id.substring(0, 5)}`}
                    </p>
                    {activity.stravaLink && (
                      <a
                        href={activity.stravaLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 text-gray-400 hover:text-[#FFA500]"
                        title="Voir sur Strava"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Voir sur Strava"
                      >
                        <SiStrava className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-gray-400 text-xs">
                    {activity.source === "strava" ? `${formatDisplayDate(activity.date)} · ` : ""}
                    {activity.source === "strava" ? `${formatDisplayDuration(activity.duration)} · ` : ""}
                    {formatDisplayDistance(activity.distance)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteActivity(activity.id);
                  }}
                  className="flex-shrink-0 p-1 rounded-full text-gray-500 hover:text-red-500 hover:bg-gray-700 transition duration-150 ease-in-out"
                  aria-label={`Supprimer l'activité ${activity.name}`}
                  title="Supprimer"
                >
                  <HiX className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Activities;
