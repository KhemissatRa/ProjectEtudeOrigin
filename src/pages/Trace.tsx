import React, { useCallback, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { throttle } from 'lodash';
import { RootState } from '../store';
import {
  setTraceColor,
  setTraceWidth,
  setTraceOpacity,
  setTraceLineStyle,
  setTraceLineCap,
  setTraceLineJoin,
  TraceState
} from '../store/traceSlice';
import { Field, Input, Label, Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';

// Options pour les listes déroulantes (Types)
type LineStyleOption = TraceState['lineStyle'];
type LineCapOption = TraceState['lineCap'];
type LineJoinOption = TraceState['lineJoin'];

const LINE_STYLE_OPTIONS: LineStyleOption[] = ['solid', 'dashed', 'dotted'];
const LINE_CAP_OPTIONS: LineCapOption[] = ['butt', 'round', 'square'];
const LINE_JOIN_OPTIONS: LineJoinOption[] = ['bevel', 'round', 'miter'];

// --- SVGs pour les aperçus ---
const LineStylePreview: React.FC<{ style: LineStyleOption }> = ({ style }) => {
  const commonProps = { stroke: 'currentColor', strokeWidth: 2, fill: 'none' };
  let path;
  switch (style) {
    case 'dashed':
      path = <line x1="2" y1="10" x2="28" y2="10" {...commonProps} strokeDasharray="4 4" />;
      break;
    case 'dotted':
      path = <line x1="2" y1="10" x2="28" y2="10" {...commonProps} strokeDasharray="1 4" strokeLinecap="round" />;
      break;
    case 'solid':
    default:
      path = <line x1="2" y1="10" x2="28" y2="10" {...commonProps} />;
      break;
  }
  return <svg width="30" height="20" viewBox="0 0 30 20" className="mr-2 flex-shrink-0">{path}</svg>;
};

const LineCapPreview: React.FC<{ cap: LineCapOption }> = ({ cap }) => (
  <svg width="30" height="20" viewBox="0 0 30 20" className="mr-2 flex-shrink-0">
    <line x1="5" y1="10" x2="25" y2="10" stroke="currentColor" strokeWidth="4" strokeLinecap={cap} />
  </svg>
);

const LineJoinPreview: React.FC<{ join: LineJoinOption }> = ({ join }) => (
  <svg width="30" height="20" viewBox="0 0 30 20" className="mr-2 flex-shrink-0">
    <polyline points="5,15 15,5 25,15" stroke="currentColor" strokeWidth="3" fill="none" strokeLinejoin={join} />
  </svg>
);
// --- Fin SVGs ---

const Trace = () => {
  const dispatch = useDispatch();
  const { color, width, opacity, lineStyle, lineCap, lineJoin } = useSelector((state: RootState) => state.trace);

  // 1. Fonction mémoisée pour dispatcher la couleur
  const dispatchSetColor = useCallback((newColor: string) => {
    dispatch(setTraceColor(newColor));
  }, [dispatch]);

  // 2. Créer la fonction throttled (ex: toutes les 200ms)
  const throttledSetColor = useMemo(
    () => throttle(dispatchSetColor, 200, { leading: false, trailing: true }),
    [dispatchSetColor]
  );

  // 3. Nettoyage au démontage
  useEffect(() => {
    return () => {
      throttledSetColor.cancel(); // Annule les appels en attente
    };
  }, [throttledSetColor]);

  // 4. Gestionnaire pour les inputs couleur
  const handleColorChange = (newColor: string) => {
    // Appelle la version throttled de la mise à jour Redux
    throttledSetColor(newColor);
  };

  const handleWidthChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      dispatch(setTraceWidth(numValue));
    }
  };

  const handleOpacityChange = (value: string) => {
     const numValue = parseFloat(value);
     if (!isNaN(numValue)) {
       dispatch(setTraceOpacity(numValue / 100)); // Convert percentage to 0-1 range
     }
  };


  return (
    <div className="space-y-6 p-1 text-white">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-lg font-semibold font-sans">Style du trace</h1>
        <p className="text-gray-400 font-light text-sm">
          Personnalisez l'apparence du trace d'activité sur la carte.
        </p>
      </div>

      {/* Color */}
      <Field>
        <Label className="text-sm font-medium">Couleur</Label>
         <div className="flex items-center gap-2 mt-1">
            <Input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded border border-white/10 bg-white/5 p-0 appearance-none focus:outline-none"
                />
            <Input
                type="text"
                value={color}
                onChange={(e) => handleColorChange(e.target.value)}
                className={clsx(
                'block w-full rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6',
                'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
                )}
                />
        </div>
      </Field>

      {/* Width */}
      <Field>
        <Label className="text-sm font-medium">Épaisseur (pixels)</Label>
        <Input
          type="number"
          min="0.5"
          max="10"
          step="0.5"
          value={width}
          onChange={(e) => handleWidthChange(e.target.value)}
          className={clsx(
            'mt-1 block w-full rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6',
            'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
          )}
        />
         {/* Optional: Slider for Width */}
        <input
            type="range"
            min="0.5"
            max="10"
            step="0.5"
            value={width}
            onChange={(e) => handleWidthChange(e.target.value)}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer mt-2"
        />
      </Field>

      {/* Opacity */}
       <Field>
        <Label className="text-sm font-medium">Opacité (%)</Label>
        <Input
          type="number"
          min="0"
          max="100"
          step="1"
          value={Math.round(opacity * 100)} // Affiché en pourcentage
          onChange={(e) => handleOpacityChange(e.target.value)}
          className={clsx(
            'mt-1 block w-full rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6',
            'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
          )}
        />
         {/* Optional: Slider for Opacity */}
         <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={Math.round(opacity * 100)}
            onChange={(e) => handleOpacityChange(e.target.value)}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer mt-2"
        />
      </Field>

      {/* Nouveau: Style de Ligne (Listbox) */}
      <Field>
        <Label className="text-sm font-medium">Style de ligne</Label>
        <Listbox value={lineStyle} onChange={(val) => dispatch(setTraceLineStyle(val))}>
          <ListboxButton
            className={clsx(
              'relative mt-1 block w-full rounded-lg bg-white/5 py-1.5 pr-8 pl-3 text-left text-sm/6',
              'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
            )}
          >
            <span className="flex items-center">
              <LineStylePreview style={lineStyle} />
              {lineStyle}
            </span>
            <ChevronDownIcon
              className="group pointer-events-none absolute top-2.5 right-2.5 size-4 fill-white/60"
              aria-hidden="true"
            />
          </ListboxButton>
          <ListboxOptions
            anchor="bottom"
            transition
            className={clsx(
              'w-[var(--button-width)] z-10 mt-1 rounded-xl border border-white/5 bg-[#333] p-1 [--anchor-gap:var(--spacing-1)] focus:outline-none',
              'transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0'
            )}
          >
            {LINE_STYLE_OPTIONS.map((option) => (
              <ListboxOption
                key={option}
                value={option}
                className="group flex cursor-default items-center gap-2 rounded-lg py-1.5 px-3 select-none data-[focus]:bg-white/10"
              >
                <CheckIcon className="invisible size-4 fill-white group-data-[selected]:visible flex-shrink-0" />
                <LineStylePreview style={option} />
                <div className="text-sm/6">{option}</div>
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
      </Field>

      {/* Nouveau: Line Cap (Listbox) */}
      <Field>
        <Label className="text-sm font-medium">Extrémité de ligne</Label>
        <Listbox value={lineCap} onChange={(val) => dispatch(setTraceLineCap(val))}>
          <ListboxButton
            className={clsx(
              'relative mt-1 block w-full rounded-lg bg-white/5 py-1.5 pr-8 pl-3 text-left text-sm/6',
              'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
            )}
          >
            <span className="flex items-center">
              <LineCapPreview cap={lineCap} />
              {lineCap}
            </span>
            <ChevronDownIcon
              className="group pointer-events-none absolute top-2.5 right-2.5 size-4 fill-white/60"
              aria-hidden="true"
            />
          </ListboxButton>
          <ListboxOptions
            anchor="bottom"
            transition
            className={clsx(
              'w-[var(--button-width)] z-10 mt-1 rounded-xl border border-white/5 bg-[#333] p-1 [--anchor-gap:var(--spacing-1)] focus:outline-none',
              'transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0'
            )}
          >
            {LINE_CAP_OPTIONS.map((option) => (
              <ListboxOption
                key={option}
                value={option}
                className="group flex cursor-default items-center gap-2 rounded-lg py-1.5 px-3 select-none data-[focus]:bg-white/10"
              >
                <CheckIcon className="invisible size-4 fill-white group-data-[selected]:visible flex-shrink-0" />
                <LineCapPreview cap={option} />
                <div className="text-sm/6">{option}</div>
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
      </Field>

      {/* Nouveau: Line Join (Listbox) */}
      <Field>
        <Label className="text-sm font-medium">Jonction de ligne</Label>
        <Listbox value={lineJoin} onChange={(val) => dispatch(setTraceLineJoin(val))}>
          <ListboxButton
            className={clsx(
              'relative mt-1 block w-full rounded-lg bg-white/5 py-1.5 pr-8 pl-3 text-left text-sm/6',
              'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
            )}
          >
            <span className="flex items-center">
              <LineJoinPreview join={lineJoin} />
              {lineJoin}
            </span>
            <ChevronDownIcon
              className="group pointer-events-none absolute top-2.5 right-2.5 size-4 fill-white/60"
              aria-hidden="true"
            />
          </ListboxButton>
          <ListboxOptions
            anchor="bottom"
            transition
            className={clsx(
              'w-[var(--button-width)] z-10 mt-1 rounded-xl border border-white/5 bg-[#333] p-1 [--anchor-gap:var(--spacing-1)] focus:outline-none',
              'transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0'
            )}
          >
            {LINE_JOIN_OPTIONS.map((option) => (
              <ListboxOption
                key={option}
                value={option}
                className="group flex cursor-default items-center gap-2 rounded-lg py-1.5 px-3 select-none data-[focus]:bg-white/10"
              >
                <CheckIcon className="invisible size-4 fill-white group-data-[selected]:visible flex-shrink-0" />
                <LineJoinPreview join={option} />
                <div className="text-sm/6">{option}</div>
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
      </Field>

    </div>
  );
};

export default Trace;