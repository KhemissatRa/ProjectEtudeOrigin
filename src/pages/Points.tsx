import clsx from "clsx";
import { RootState } from "../store";
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import {
  addPoint,
  setPointVisibility,
  setSelectedPointId,
  initializePoints,
  Point,
} from "../store/pointsSlice";

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";

import {
  FaEdit,
  FaTrash,
  FaArrowLeft,
  FaMapMarkerAlt,
} from "react-icons/fa"; // Icons from react-icons

import PointEditor from "../components/PointEditor";

interface PointsProps {
  mapEditorRef: any;
}

const Points: React.FC<PointsProps> = ({ mapEditorRef }) => {
  const dispatch = useDispatch();
  const allPointsFromState = useSelector((state: RootState) => state.points.points);
  const selectedPointId = useSelector(
    (state: RootState) => state.points.selectedPointId
  );
  const activities = useSelector(
    (state: RootState) => state.activities.activities
  );
  const activeActivityIds = useSelector(
    (state: RootState) => state.activities.activeActivityIds
  );
  const [selectAll, setSelectAll] = useState(false);
  const [selectedAvailablePoint, setSelectedAvailablePoint] = useState<
    string | null
  >(null);

  useEffect(() => {
    console.log("[Points.tsx] All points from Redux state:", allPointsFromState.length, JSON.stringify(allPointsFromState, null, 2));
    console.log("[Points.tsx] Active Activity IDs:", activeActivityIds);

    // Recalculate displayedPoints here for logging clarity
    const currentDisplayedPoints = allPointsFromState.filter(
      (point: Point) => activeActivityIds.includes(point.activityId) && point.isVisible
    );
    console.log("[Points.tsx] Calculated displayedPoints:", currentDisplayedPoints.length, JSON.stringify(currentDisplayedPoints, null, 2));

  }, [allPointsFromState, activeActivityIds]); // Log whenever the source data changes

  useEffect(() => {
    // Filtrer les activités actives
    const activeActivities = activities.filter((activity) =>
      activeActivityIds.includes(activity.id)
    );

    // Initialiser les points uniquement pour les activités actives
    dispatch(initializePoints(activeActivities));

    // Supprimer les points des activités supprimées
    allPointsFromState.filter(point => !activities.some(activity => activity.id === point.activityId)).forEach(point => {
      dispatch(setPointVisibility({ id: point.id, isVisible: false }));
    });
  }, [dispatch, activities, activeActivityIds, activities.length]); // Add activities.length here

  const [availablePoints, setAvailablePoints] = useState<string[]>([]);

  useEffect(() => {
    // Filtrer les points disponibles en fonction des activités actives
    const deletedPointIds = allPointsFromState
      .filter(
        (point) =>
          !point.isVisible && activeActivityIds.includes(point.activityId)
      )
      .map((point) => point.id);
    setAvailablePoints(deletedPointIds);

  }, [allPointsFromState, activeActivityIds]);

  const handleDeletePoint = (id: string) => {
    dispatch(setPointVisibility({ id: id, isVisible: false }));
    setSelectAll(false);
  };

  const handleAddPoint = (id: string) => {
    dispatch(addPoint(id));
    dispatch(setPointVisibility({ id: id, isVisible: true }));
    setSelectAll(false);
    setSelectedAvailablePoint(null); // Reset selected value after adding
  };

  const handleSelectPoint = (id: string) => {
    dispatch(setSelectedPointId(id));
  };

  const handleReturnToList = () => {
    dispatch(setSelectedPointId(null));
  };

  const unvisiblePoints = allPointsFromState.filter(
    (point: Point) => !point.isVisible && activeActivityIds.includes(point.activityId)
  );

  // Calculate displayedPoints for rendering (using the same logic as the logger)
  const displayedPoints = allPointsFromState.filter(
    (point: Point) => activeActivityIds.includes(point.activityId) && point.isVisible
  );


  return (
    <div className="space-y-8 p-4 md:p-6 max-w-md mx-auto md:max-w-none">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-lg font-semibold font-sans text-white">
          Points d'intérêt
        </h1>
        <p className="text-gray-400 font-light text-sm">
          Gérez les points d'intérêt affichés sur la carte.
        </p>
      </div>

      {/* Conditionnellement afficher l'éditeur ou la liste */}
      {selectedPointId ? (
        /* Éditeur de point (affiché seul) */
        <div className="space-y-8">
          <button
            onClick={handleReturnToList}
            className="inline-flex items-center text-white hover:opacity-75 cursor-pointer transition duration-150 ease-in-out"
          >
            <FaArrowLeft className="mr-2" /> Retour à la liste
          </button>
          <PointEditor pointId={selectedPointId} mapEditorRef={mapEditorRef} />
        </div>
      ) : (
        /* Liste des points (masquée lors de l'édition) */
        <div className="space-y-3">
          {/* Top Bar (Select All, Delete, Add) */}
          <div className="flex items-center justify-between">
            <div className="text-white font-medium">
              Points ({displayedPoints.length})
            </div>

            <div className="flex items-center space-x-2">
              {/* Delete Button */}
              <button
                onClick={() =>
                  displayedPoints
                    .filter((point) => point.isVisible)
                    .forEach((point) => handleDeletePoint(point.id))
                }
                className="flex flex-col items-center justify-center p-2 rounded-md bg-[#333] h-8 w-8 hover:opacity-75 cursor-pointer text-gray-400 hover:text-white transition duration-150 ease-in-out"
                title="Supprimer tous les points visibles"
                disabled={
                  displayedPoints.filter((point) => point.isVisible).length ===
                  0
                }
              >
                <FaTrash className="h-3 w-3" />
              </button>

              {/* Add Button (Ajouter un point) */}
              <div className="w-38">
                <Listbox
                  value={selectedAvailablePoint}
                  onChange={handleAddPoint}
                >
                  <ListboxButton
                    className={clsx(
                      "relative block w-full rounded-lg bg-[#333] py-1.5 pr-8 pl-3 text-left text-sm/6 text-white",
                      "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25"
                    )}
                  >
                    <span className="block truncate">
                      {selectedAvailablePoint
                        ? allPointsFromState.find((p) => p.id === selectedAvailablePoint)
                            ?.name
                        : "Ajouter un point"}
                    </span>
                    <ChevronDownIcon
                      className="group pointer-events-none absolute top-2.5 right-2.5 size-4 fill-white/60"
                      aria-hidden="true"
                    />
                  </ListboxButton>
                  {unvisiblePoints.length > 0 && (
                    <ListboxOptions
                      anchor="bottom"
                      transition
                      className={clsx(
                        "w-[var(--button-width)] z-50 mt-1 rounded-xl border border-white/5 bg-[#333] p-1 [--anchor-gap:var(--spacing-1)] focus:outline-none",
                        "transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0"
                      )}
                    >
                      {unvisiblePoints.map((point) => (
                        <ListboxOption
                          key={point.id}
                          value={point.id}
                          className="group flex cursor-default items-center gap-2 rounded-lg py-1.5 px-3 select-none data-[focus]:bg-white/10"
                        >
                          <div className="text-sm/6 text-white">
                            {point.name}
                          </div>
                        </ListboxOption>
                      ))}
                    </ListboxOptions>
                  )}
                </Listbox>
              </div>
            </div>
          </div>

          {/* Liste des points */}
          <div className="flex flex-col space-y-2">
            {displayedPoints.length > 0 &&
              displayedPoints.map((point, index) => (
                <div
                  key={point.id}
                  className={`flex items-center space-x-3 py-2.5 px-3 rounded-md transition duration-150 ease-in-out cursor-pointer border border-gray-700/50 hover:bg-gray-700/50`}
                  onClick={() => handleSelectPoint(point.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") &&
                    handleSelectPoint(point.id)
                  }
                >
                  <div className="flex-shrink-0 w-7 h-7 bg-gray-600 flex items-center justify-center rounded-sm text-gray-400">
                    <FaMapMarkerAlt className="w-4 h-4" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <p
                        className="text-white font-medium text-sm truncate"
                        title={point.name}
                      >
                        {index + 1}. {point.name}
                      </p>
                    </div>
                    <p className="text-gray-400 text-xs text-left">
                      Activité :{" "}
                      {activities.find((act) => act.id === point.activityId)
                        ?.name || "Activité sans nom"}
                    </p>
                    <p className="text-gray-400 text-xs text-left">
                      Coordonnées : {point.coordinate?.[0]?.toFixed(5)},{" "}
                      {point.coordinate?.[1]?.toFixed(5)}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPoint(point.id);
                      }}
                      className="flex-shrink-0 p-1 w-7 h-7 flex flex-col items-center justify-center cursor-pointer rounded-full text-gray-500 hover:text-blue-500 hover:bg-gray-700 transition duration-150 ease-in-out"
                      aria-label={`Éditer ${point.name}`}
                      title="Éditer"
                    >
                      <FaEdit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePoint(point.id);
                      }}
                      className="flex-shrink-0 p-1 w-7 h-7 flex flex-col items-center justify-center cursor-pointer rounded-full text-gray-500 hover:text-red-500 hover:bg-gray-700 transition duration-150 ease-in-out"
                      aria-label={`Supprimer ${point.name}`}
                      title="Supprimer"
                    >
                      <FaTrash className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Points;