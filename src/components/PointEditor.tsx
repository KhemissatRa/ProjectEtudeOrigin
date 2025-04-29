import { RootState } from "../store";
import { useDispatch, useSelector } from "react-redux";
import { Point, updatePoint } from "../store/pointsSlice";
import React, { useState, useEffect, useCallback, useRef } from "react";

// CHANGEMENT: Importer FaCaretDown au lieu de FaPlay pour cohérence avec CustomMarkerContent
import { FaCircle, FaCaretDown } from "react-icons/fa";
import { Field, Input, Label as HeadlessLabel } from "@headlessui/react"; // Renommer Label pour éviter conflit
import { Radio, RadioGroup } from "@headlessui/react";
import clsx from "clsx";

interface PointEditorProps {
  pointId: string;
  mapEditorRef: React.RefObject<{ // Utiliser RefObject pour typer la ref
    setPointPlacementMode: (enabled: boolean, callback: (coords: number[]) => void) => void;
  }>;
}

const PointEditor: React.FC<PointEditorProps> = ({ pointId, mapEditorRef }) => {
  const dispatch = useDispatch();
  const point = useSelector((state: RootState) =>
    state.points.points.find((p) => p.id === pointId)
  );

  // Etats locaux pour les couleurs (pour une mise à jour plus réactive de l'UI des pickers)
  const [localColor, setLocalColor] = useState(point?.style?.color || "#000000");
  const [localTextColor, setLocalTextColor] = useState(point?.style?.textColor || "#FFFFFF");
  const [localName, setLocalName] = useState(point?.name || "");
  const [localDescription, setLocalDescription] = useState(point?.description || "");

  // Mise à jour des états locaux quand le point (ou son ID) change
  useEffect(() => {
    if (point) {
      setLocalColor(point.style?.color || "#000000");
      setLocalTextColor(point.style?.textColor || "#FFFFFF");
      setLocalName(point.name || "");
      setLocalDescription(point.description || "");
    }
  }, [pointId, point]);

  // Ref pour le timeout du debounce pour les champs texte et couleur
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const colorDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fonction de mise à jour générique (avec debounce optionnel)
  const updateReduxPoint = useCallback(
    (updates: Partial<Point> & { style?: Partial<Point['style']> }, debounceDelay: number | null = 250) => {
        if (point) {
            const isColorUpdate = updates.style && (updates.style.color !== undefined || updates.style.textColor !== undefined);
            const timeoutRef = isColorUpdate ? colorDebounceTimeoutRef : debounceTimeoutRef;

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            if (debounceDelay !== null) {
                 timeoutRef.current = setTimeout(() => {
                    dispatch(updatePoint({ id: point.id, updates }));
                }, debounceDelay);
            } else {
                 dispatch(updatePoint({ id: point.id, updates }));
            }
        }
    },
    [dispatch, point]
  );


  // --- Handlers pour les champs ---

  // Nom (avec debounce)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalName(newValue);
    updateReduxPoint({ name: newValue });
  };

  // Description (avec debounce)
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalDescription(newValue);
    updateReduxPoint({ description: newValue });
  };

   // Forme (mise à jour immédiate)
   const handleShapeChange = (newShape: 'circle' | 'triangle') => {
       if (point && point.style.shape !== newShape) {
           updateReduxPoint({ style: { shape: newShape } }, null);
       }
   };

  // Couleur de Fond (avec debounce)
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setLocalColor(newColor);
    updateReduxPoint({ style: { color: newColor } });
  };

  // Couleur de Texte (avec debounce)
  const handleTextColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTextColor = e.target.value;
    setLocalTextColor(newTextColor);
    updateReduxPoint({ style: { textColor: newTextColor } });
  };


  // Placer sur la carte (action directe)
  const handlePlaceOnMap = useCallback(() => {
    if (mapEditorRef && mapEditorRef.current && point) {
        console.log("Requesting point placement mode...");
      mapEditorRef.current.setPointPlacementMode(
        true,
        (coordinates: number[]) => {
          console.log("Coordinates received from map click:", coordinates);
          updateReduxPoint({ coordinate: coordinates as [number, number] }, null);
        }
      );
    } else {
        console.warn("Cannot place on map: Ref not ready or point missing.");
    }
  }, [mapEditorRef, point, updateReduxPoint]);

  if (!point) {
    return <div className="text-gray-500 text-center p-4">Point non trouvé ou désélectionné.</div>;
  }

  const currentShape = point.style?.shape || "circle";

  return (
    <div className="space-y-4 rounded-md relative">
      {/* Utilisation de Field + HeadlessLabel pour les champs Input */}
      <Field>
        <HeadlessLabel className="text-sm/6 font-medium text-white">Nom</HeadlessLabel>
        <Input
          value={localName}
          onChange={handleNameChange}
          className={clsx(
            "mt-1 block w-full rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white",
            "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25"
          )}
          placeholder="Nom du point d'intérêt"
        />
      </Field>

      <Field>
        <HeadlessLabel className="text-sm/6 font-medium text-white">Description (optionnel)</HeadlessLabel>
        <Input
          value={localDescription}
          onChange={handleDescriptionChange}
          className={clsx(
            "mt-1 block w-full rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white",
            "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25"
          )}
          placeholder="Courte description"
        />
      </Field>

      {/* --- Groupe Style --- */}
      <div className="border border-gray-700/50 rounded-lg p-3 space-y-3">
         <h3 className="text-sm font-medium text-white mb-2">Style du Marqueur</h3>

        {/* Shape - Utilisation de RadioGroup.Label */}
         <RadioGroup
           value={currentShape}
           onChange={handleShapeChange}
           className="flex items-center space-x-4"
         >
           {/* Utilisation correcte de RadioGroup.Label */}
           <RadioGroup.Label className="text-sm/6 font-medium text-white w-20 shrink-0">Forme</RadioGroup.Label>
           <div className="flex space-x-2 items-center">
             {/* Option Cercle */}
             <Radio value="circle" className="focus:outline-none cursor-pointer group">
               {({ checked }) => (
                 <div className={clsx("p-2 rounded-md flex items-center justify-center ring-1 ring-inset ring-white/10 group-data-[checked]:ring-blue-500", { "bg-white/10": checked })}>
                   <FaCircle className="w-4 h-4 text-white/80" />
                 </div>
               )}
             </Radio>
             {/* Séparateur "ou" */}
             <span className="mr-2 text-sm text-gray-300 font-semibold select-none">ou</span>
             {/* Option Triangle */}
             <Radio value="triangle" className="focus:outline-none cursor-pointer group">
               {({ checked }) => (
                 <div className={clsx("p-2 rounded-md flex items-center justify-center ring-1 ring-inset ring-white/10 group-data-[checked]:ring-blue-500", { "bg-white/10": checked })}>
                   {/* CHANGEMENT ICI: Utilise FaCaretDown dans l'éditeur aussi */}
                   <FaCaretDown className="w-4 h-4 text-white/80" />
                 </div>
               )}
             </Radio>
           </div>
         </RadioGroup>


        {/* Couleur de Fond - Utilisation de label HTML standard car input type="color" n'est pas un champ Headless UI */}
        <div className="flex items-center space-x-4">
            <label htmlFor="color" className="block text-sm font-medium text-white w-20 shrink-0">
            Fond
            </label>
            <input
            type="color"
            name="color"
            id="color"
            className="h-8 w-full cursor-pointer appearance-none border border-white/10 rounded-md bg-white/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
            value={localColor}
            onChange={handleColorChange}
            />
        </div>

        {/* Couleur de Texte - Utilisation de label HTML standard */}
         <div className="flex items-center space-x-4">
            <label htmlFor="textColor" className="block text-sm font-medium text-white w-20 shrink-0">
            Texte
            </label>
            <input
            type="color"
            name="textColor"
            id="textColor"
             className="h-8 w-full cursor-pointer appearance-none border border-white/10 rounded-md bg-white/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
            value={localTextColor}
            onChange={handleTextColorChange}
            />
        </div>
      </div>

       {/* --- Groupe Position --- */}
        <div className="border border-gray-700/50 rounded-lg p-3 space-y-3">
             <h3 className="text-sm font-medium text-white mb-2">Position</h3>
            {/* Coordonnées - Remplacé Headless Label par un div standard */}
             <div>
                <div className="text-sm/6 font-medium text-white">Coordonnées</div> {/* Label simple */}
                <div className="mt-1 flex items-center space-x-2 text-xs text-gray-400">
                     <span>Lng: {point.coordinate ? point.coordinate[0].toFixed(5) : 'N/A'}</span>
                     <span>Lat: {point.coordinate ? point.coordinate[1].toFixed(5) : 'N/A'}</span>
                </div>
             </div>
        </div>
    </div>
  );
};

export default PointEditor;