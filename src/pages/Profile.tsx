import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  setProfileVisibility,
  setProfileStyle,
  setProfileColor,
  setGradientLength,
  GradientLength,
  ProfileStyle,
  setShowGradientEffect,
  setChartHeight,
} from '../store/profileSlice';
import { Radio, RadioGroup, Field, Input, Label, Switch } from '@headlessui/react';
import clsx from 'clsx';
import { FaChartArea, FaChartLine } from 'react-icons/fa'; // Example icons

const Profile = () => {
  const dispatch = useDispatch();
  const { isVisible, style, color, gradientLength, showGradientEffect, chartHeight } = useSelector(
    (state: RootState) => state.profile
  );

  // --- Local state for debounced color input ---
  const [localColor, setLocalColor] = useState(color);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync Redux color to local state if it changes externally
  useEffect(() => {
    setLocalColor(color);
  }, [color]);

  // Debounced dispatch function
  const debouncedDispatchColor = useCallback((newColor: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      // Basic hex color validation
      if (/^#[0-9A-F]{6}$/i.test(newColor) || /^#[0-9A-F]{8}$/i.test(newColor)) {
        dispatch(setProfileColor(newColor));
      } else {
          // Optional: handle invalid color input, maybe revert local state or show error
          console.warn("Invalid hex color format entered.");
          // Revert local state to last valid Redux state color
          // setLocalColor(color);
      }
    }, 300); // 300ms debounce
  }, [dispatch]); // Removed 'color' dependency as we use the latest from Redux via state sync

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Handle color input changes
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setLocalColor(newColor); // Update local state immediately
    debouncedDispatchColor(newColor); // Debounce dispatch
  };

  const gradientOptions: GradientLength[] = ['S', 'M', 'L'];

  return (
    <div className="space-y-6 p-1 text-white">
      {/* En-tête */}
      <div className="space-y-1">
        <h1 className="text-lg font-semibold font-sans">Profil d'altitude</h1>
        <p className="text-gray-400 font-light text-sm">
          Personnalisez le graphique d'altitude.
        </p>
      </div>

      {/* Afficher le profil */}
      <Field className="flex items-center justify-between">
        <div className="flex items-center">
          <Switch.Group>
            <Switch.Label className="text-sm font-medium cursor-pointer mr-2" passive>
              Afficher le profil
            </Switch.Label>
            <Switch
              checked={isVisible}
              onChange={(val) => dispatch(setProfileVisibility(val))}
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
          </Switch.Group>
        </div>
      </Field>

      {/* Style de profil */}
      <Field>
        <Label className={clsx('text-sm font-medium', !isVisible && 'text-gray-500')}>Style</Label>
        <RadioGroup
          value={style}
          onChange={(value: ProfileStyle) => dispatch(setProfileStyle(value))}
          className="space-y-2 mt-3"
          disabled={!isVisible}
        >
          <div className="grid grid-cols-2 gap-2">
            {(['area', 'line'] as ProfileStyle[]).map((option) => (
              <Radio
                key={option}
                value={option}
                disabled={!isVisible}
                className={({ checked }) =>
                  clsx(
                    'cursor-pointer rounded-lg p-3 flex items-center justify-center text-sm font-medium bg-white/5',
                    checked && 'ring-2 ring-blue-500 bg-white/10',
                    'focus:outline-none data-[focus]:outline-1 data-[focus]:outline-white',
                    !isVisible && 'opacity-50 cursor-not-allowed'
                  )
                }
              >
                {option === 'area' && <FaChartArea className="w-5 h-5 mr-2" />}
                {option === 'line' && <FaChartLine className="w-5 h-5 mr-2" />}
                {option === 'area' ? 'Zone' : 'Ligne'}
              </Radio>
            ))}
          </div>
        </RadioGroup>
      </Field>

      {/* Options de gradient - Afficher uniquement si le style est 'area' */}
      {style === 'area' && (
        <Field>
          <div className="flex items-center justify-between mb-3"> {/* Container for Label + Switch */}
            <Label className={clsx('text-sm font-medium', !isVisible && 'text-gray-500')}>
              Longueur du gradient
            </Label>
            {/* Gradient Toggle Switch - Moved here */}
            <Switch
              checked={showGradientEffect}
              onChange={(val) => dispatch(setShowGradientEffect(val))}
              disabled={!isVisible}
              className={clsx(
                'group relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900',
                'data-[checked]:bg-blue-600 bg-gray-500',
                !isVisible && 'opacity-50 cursor-not-allowed'
              )}
            >
               <Label className="sr-only">Utiliser l'effet de gradient</Label> {/* Screen reader label */}
              <span
                aria-hidden="true"
                className={clsx(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  'translate-x-0 data-[checked]:translate-x-5'
                )}
              />
            </Switch>
          </div>
          {/* Gradient Length Radio Group */}
          <RadioGroup
            value={gradientLength}
            onChange={(value: GradientLength) => dispatch(setGradientLength(value))}
            className="space-y-2" // Removed mt-3 as spacing handled by parent div mb-3
            disabled={!isVisible || !showGradientEffect} // Also disable if gradient effect is off
          >
            <div className="grid grid-cols-3 gap-2">
              {gradientOptions.map((option) => (
                <Radio
                  key={option}
                  value={option}
                  disabled={!isVisible || !showGradientEffect}
                  className={({ checked }) =>
                    clsx(
                      'cursor-pointer rounded-lg p-3 text-center text-sm font-medium bg-white/5',
                      checked && 'ring-2 ring-blue-500 bg-white/10',
                      'focus:outline-none data-[focus]:outline-1 data-[focus]:outline-white',
                      (!isVisible || !showGradientEffect) && 'opacity-50 cursor-not-allowed' // Adjust disabled style check
                    )
                  }
                >
                  {option}
                </Radio>
              ))}
            </div>
          </RadioGroup>
        </Field>
      )}

      {/* Contrôle de la hauteur du graphique - Interface utilisateur moderne Fluent */}
      <Field>
        <div className="flex items-center justify-between mb-1">
          <Label className={clsx('text-sm font-semibold tracking-wide', !isVisible && 'text-gray-500')}>Hauteur du graphique</Label>
          <span className="text-xs text-gray-400">{chartHeight} px</span>
        </div>
        <div className="flex items-center w-full gap-3">
          <input
            type="range"
            min={40}
            max={200}
            step={1}
            value={chartHeight}
            onChange={e => dispatch(setChartHeight(Number(e.target.value)))}
            disabled={!isVisible}
            className={clsx(
              'w-full h-2 rounded-lg appearance-none bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              !isVisible && 'opacity-50 cursor-not-allowed'
            )}
            style={{ accentColor: '#2563eb' }}
          />
          <input
            type="number"
            min={40}
            max={200}
            step={1}
            value={chartHeight}
            onChange={e => dispatch(setChartHeight(Number(e.target.value)))}
            disabled={!isVisible}
            className={clsx(
              'w-16 rounded-md border-none bg-white/10 text-sm px-2 py-1 text-center transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              !isVisible && 'opacity-50 cursor-not-allowed'
            )}
          />
        </div>
      </Field>

      {/* Couleur */}
      <Field disabled={!isVisible}>
        <Label className={clsx('text-sm font-medium', !isVisible && 'text-gray-500')}>Couleur</Label>
        <div className="flex items-center gap-2 mt-3">
          <Input
            type="color"
            value={localColor} // Use local state
            onChange={handleColorChange} // Use new handler
            disabled={!isVisible}
            className={clsx(
              'h-8 w-8 cursor-pointer rounded border border-white/10 bg-white/5 p-0 appearance-none focus:outline-none',
              !isVisible && 'opacity-50 cursor-not-allowed'
            )}
          />
          <Input
            type="text"
            value={localColor} // Use local state
            onChange={handleColorChange} // Use new handler
            disabled={!isVisible}
            className={clsx(
              'block w-full rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6',
              'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25',
              !isVisible && 'opacity-50 cursor-not-allowed text-gray-500'
            )}
          />
        </div>
      </Field>

      {/* Graduation (Axe) Toggle - Not in example, but logical */}
      {/*
       <Field className="flex items-center justify-between">
           <Label className={clsx("text-sm font-medium cursor-pointer", !isVisible && "text-gray-500")} passive>
               Afficher la graduation
           </Label>
           <Switch
               checked={showAxis}
               onChange={(val) => dispatch(setShowAxis(val))}
               disabled={!isVisible}
               className={...} // Same styling as other switches
           >
               ...
           </Switch>
       </Field>
       */}
    </div>
  );
};

export default Profile;