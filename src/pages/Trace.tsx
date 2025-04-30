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
import { useTranslation } from 'react-i18next';
import { addPosterToCart } from '../store/cartSlice';
import CartLoaderOverlay from '../components/CartLoaderOverlay';
import { useNavigate } from 'react-router-dom';

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

interface TraceProps {
  mapEditorRef: any;
}

const Trace: React.FC<TraceProps> = ({ mapEditorRef }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { color, width, opacity, lineStyle, lineCap, lineJoin } = useSelector((state: RootState) => state.trace);
  const [isAddingToCart, setIsAddingToCart] = React.useState(false);
  const navigate = useNavigate();
  const labels = useSelector((state: RootState) => state.labels);
  const points = useSelector((state: RootState) => state.points.points);
  const layout = useSelector((state: RootState) => state.layout);
  const map = useSelector((state: RootState) => state.map);
  const profile = useSelector((state: RootState) => state.profile);
  const product = useSelector((state: RootState) => state.product);
  const activities = useSelector((state: RootState) => state.activities.activities);
  const activeActivityIds = useSelector((state: RootState) => state.activities.activeActivityIds);
  const trace = useSelector((state: RootState) => state.trace);

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

  const handleAddToCart = async () => {
    if (!mapEditorRef?.current || !mapEditorRef.current.generatePreviewImage) {
      alert("Erreur : Impossible d'accéder à l'éditeur ou à la carte pour générer l'aperçu.");
      return;
    }
    setIsAddingToCart(true);
    try {
      const thumbnailUrl = await mapEditorRef.current.generatePreviewImage();
      const { currentPrice: _, ...productDetails } = product;
      const productForCart = {
        ...productDetails,
        price: product.currentPrice,
      };
      const posterConfiguration = {
        labels,
        points,
        layout,
        map,
        trace,
        profile,
        product: productForCart,
        activeActivityIds,
        activitiesData: activities,
      };
      dispatch(addPosterToCart({
        id: `cart-${Date.now()}-${Math.random().toString(16).substring(2, 8)}`,
        configuration: posterConfiguration,
        thumbnailUrl: thumbnailUrl ?? undefined,
      }));
      navigate('/cart');
    } catch (error) {
      alert("Erreur lors de l'ajout au panier");
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="space-y-6 p-1 text-white">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-lg font-semibold font-sans">{t('trace.title')}</h1>
        <p className="text-gray-400 font-light text-sm">
          {t('trace.subtitle')}
        </p>
      </div>

      {/* Color */}
      <Field>
        <Label className="text-sm font-medium">{t('trace.color')}</Label>
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
        <Label className="text-sm font-medium">{t('trace.width')}</Label>
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
        <Label className="text-sm font-medium">{t('trace.opacity')}</Label>
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
        <Label className="text-sm font-medium">{t('trace.line_style')}</Label>
        <Listbox value={lineStyle} onChange={(val) => dispatch(setTraceLineStyle(val))}>
          <ListboxButton
            className={clsx(
              'relative mt-1 block w-full rounded-lg bg-white/5 py-1.5 pr-8 pl-3 text-left text-sm/6',
              'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
            )}
          >
            <span className="flex items-center">
              <LineStylePreview style={lineStyle} />
              {t(`trace.line_style_${lineStyle}`)}
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
                <div className="text-sm/6">{t(`trace.line_style_${option}`)}</div>
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
      </Field>

      {/* Nouveau: Line Cap (Listbox) */}
      <Field>
        <Label className="text-sm font-medium">{t('trace.line_cap')}</Label>
        <Listbox value={lineCap} onChange={(val) => dispatch(setTraceLineCap(val))}>
          <ListboxButton
            className={clsx(
              'relative mt-1 block w-full rounded-lg bg-white/5 py-1.5 pr-8 pl-3 text-left text-sm/6',
              'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
            )}
          >
            <span className="flex items-center">
              <LineCapPreview cap={lineCap} />
              {t(`trace.line_cap_${lineCap}`)}
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
                <div className="text-sm/6">{t(`trace.line_cap_${option}`)}</div>
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
      </Field>

      {/* Nouveau: Line Join (Listbox) */}
      <Field>
        <Label className="text-sm font-medium">{t('trace.line_join')}</Label>
        <Listbox value={lineJoin} onChange={(val) => dispatch(setTraceLineJoin(val))}>
          <ListboxButton
            className={clsx(
              'relative mt-1 block w-full rounded-lg bg-white/5 py-1.5 pr-8 pl-3 text-left text-sm/6',
              'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
            )}
          >
            <span className="flex items-center">
              <LineJoinPreview join={lineJoin} />
              {t(`trace.line_join_${lineJoin}`)}
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
                <div className="text-sm/6">{t(`trace.line_join_${option}`)}</div>
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
      </Field>

      {/* Bouton Ajouter au panier en bas, style identique à Overview */}
      {isAddingToCart && <CartLoaderOverlay message={t('overview.adding_to_cart')} />}
      <button
        onClick={handleAddToCart}
        disabled={isAddingToCart}
        className="w-full text-sm cursor-pointer flex justify-center items-center space-x-2 bg-orange-500 hover:opacity-75 text-white py-2 rounded-sm disabled:opacity-50 disabled:cursor-wait mt-8"
      >
        {isAddingToCart ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{t('overview.adding_to_cart')}</span>
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 1 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span>{t('overview.add_to_cart')}</span>
          </>
        )}
      </button>

    </div>
  );
};

export default Trace;