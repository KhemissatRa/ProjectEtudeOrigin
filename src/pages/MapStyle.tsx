import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  setMapStyle,
  setShowTerrain,
  setShowLabels,
  MAP_STYLE_OPTIONS,
  MapStyleOption,
} from '../store/mapSlice';
import { Radio, RadioGroup, Switch, Label, Field } from '@headlessui/react';
import clsx from 'clsx';
import { CheckIcon } from '@heroicons/react/20/solid'; // ou votre icône de coche

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const MapStyle = () => {
  const dispatch = useDispatch();
  const { selectedStyleId, showTerrain, showLabels } = useSelector(
    (state: RootState) => state.map
  );
  const selectedStyleInfo = MAP_STYLE_OPTIONS.find(s => s.id === selectedStyleId);

  const handleTerrainToggle = (enabled: boolean) => {
      // Assurez-vous que le style actuel supporte le terrain avant d'activer
      if (selectedStyleInfo?.hasTerrain) {
          dispatch(setShowTerrain(enabled));
      } else if (!enabled) {
          dispatch(setShowTerrain(false)); // Permettre de désactiver même si non supporté
      }
  };

  return (
    <div className="space-y-6 p-1 text-white">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-lg font-semibold font-sans">Style de Carte</h1>
        <p className="text-gray-400 font-light text-sm">
          Choisissez l'apparence de votre carte.
        </p>
      </div>

      {/* Map Style Selection */}
      <Field>
        <Label className="text-sm font-medium">Styles de carte</Label>
        <RadioGroup
          value={selectedStyleId}
          onChange={(id: string) => dispatch(setMapStyle(id))}
          className="space-y-2 mt-3"
        >
          <div className="grid grid-cols-3 gap-2">
            {MAP_STYLE_OPTIONS.map((style: MapStyleOption) => {
              // Extract username and style_id from the mapbox URL
              const urlParts = style.url.replace('mapbox://styles/', '').split('/');
              const username = urlParts[0];
              const style_id = urlParts[1];

              // Construct the Mapbox Static Image API URL
              const thumbnailUrl = `https://api.mapbox.com/styles/v1/${username}/${style_id}/static/2.35,48.85,5,0,0/200x200?access_token=${MAPBOX_TOKEN}`;

              return (
                <Radio
                  key={style.id}
                  value={style.id}
                  className={({ checked }) => clsx(
                    'relative flex cursor-pointer rounded-lg p-1 focus:outline-none',
                    checked ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-blue-500' : 'ring-1 ring-white/10 hover:ring-white/30'
                  )}
                >
                    {({ checked }) => (
                        <>
                            <img
                                src={thumbnailUrl}
                                alt={style.name}
                                className="w-full h-auto object-cover rounded bg-gray-600"
                            />
                            {checked && (
                                <div className="absolute inset-0 rounded-lg ring-2 ring-inset ring-blue-500 flex items-center justify-center bg-black/30">
                                    <CheckIcon className="h-6 w-6 text-white" />
                                </div>
                            )}
                         </>
                    )}
                </Radio>
              );
            })}
          </div>
        </RadioGroup>
      </Field>

       {/* Toggles */}
       <div className="space-y-4 pt-4">
            {/* Terrain Toggle */}
            <Field className="flex items-center justify-between">
                <Label className="text-sm font-medium cursor-pointer" passive>
                    Relief (3D)
                    {!selectedStyleInfo?.hasTerrain && <span className="text-xs text-gray-500 ml-1">(Non supporté par le style actuel)</span>}
                </Label>
                <Switch
                    checked={showTerrain && !!selectedStyleInfo?.hasTerrain} // checked seulement si actif ET supporté
                    onChange={handleTerrainToggle}
                    disabled={!selectedStyleInfo?.hasTerrain} // désactivé si non supporté
                    className={clsx(
                    'group relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900',
                    'data-[checked]:bg-blue-600 bg-gray-500',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                >
                    <span
                    aria-hidden="true"
                    className={clsx(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                        'translate-x-0 data-[checked]:translate-x-5'
                    )}
                    />
                </Switch>
            </Field>

            {/* Labels Toggle */}
            <Field className="flex items-center justify-between">
                <Label className="text-sm font-medium cursor-pointer" passive>
                    Afficher les étiquettes
                </Label>
                <Switch
                    checked={showLabels}
                    onChange={(val) => dispatch(setShowLabels(val))}
                    className={clsx(
                    'group relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900',
                    'data-[checked]:bg-blue-600 bg-gray-500'
                    )}
                >
                    <span
                    aria-hidden="true"
                    className={clsx(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                        'translate-x-0 data-[checked]:translate-x-5'
                    )}
                    />
                </Switch>
            </Field>
       </div>

    </div>
  );
};

export default MapStyle;