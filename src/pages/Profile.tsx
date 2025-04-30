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
import { useTranslation } from 'react-i18next';
import { addPosterToCart } from '../store/cartSlice';
import CartLoaderOverlay from '../components/CartLoaderOverlay';
import { useNavigate } from 'react-router-dom';

interface ProfileProps {
  mapEditorRef: any;
}

const Profile: React.FC<ProfileProps> = ({ mapEditorRef }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
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

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const navigate = useNavigate();
  const labels = useSelector((state: RootState) => state.labels);
  const points = useSelector((state: RootState) => state.points.points);
  const layout = useSelector((state: RootState) => state.layout);
  const map = useSelector((state: RootState) => state.map);
  const trace = useSelector((state: RootState) => state.trace);
  const product = useSelector((state: RootState) => state.product);
  const activities = useSelector((state: RootState) => state.activities.activities);
  const activeActivityIds = useSelector((state: RootState) => state.activities.activeActivityIds);
  const profile = useSelector((state: RootState) => state.profile);

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
      {/* En-tête */}
      <div className="space-y-1">
        <h1 className="text-lg font-semibold font-sans">{t('profile.title')}</h1>
        <p className="text-gray-400 font-light text-sm">
          {t('profile.subtitle')}
        </p>
      </div>

      {/* Afficher le profil */}
      <Field className="flex items-center justify-between">
        <div className="flex items-center">
          <Switch.Group>
            <Switch.Label className="text-sm font-medium cursor-pointer mr-2" passive>
              {t('profile.show_profile')}
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
        <Label className={clsx('text-sm font-medium', !isVisible && 'text-gray-500')}>{t('profile.style')}</Label>
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
                {option === 'area' ? t('profile.style_area') : t('profile.style_line')}
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
              {t('profile.gradient_length')}
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
               <Label className="sr-only">{t('profile.use_gradient_effect')}</Label> {/* Screen reader label */}
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
            className="space-y-2"
            disabled={!isVisible || !showGradientEffect}
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
                      (!isVisible || !showGradientEffect) && 'opacity-50 cursor-not-allowed'
                    )
                  }
                >
                  {t(`profile.gradient_length_${option}`)}
                </Radio>
              ))}
            </div>
          </RadioGroup>
        </Field>
      )}

      {/* Contrôle de la hauteur du graphique - Interface utilisateur moderne Fluent */}
      <Field>
        <div className="flex items-center justify-between mb-1">
          <Label className={clsx('text-sm font-semibold tracking-wide', !isVisible && 'text-gray-500')}>{t('profile.chart_height')}</Label>
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
        <Label className={clsx('text-sm font-medium', !isVisible && 'text-gray-500')}>{t('profile.color')}</Label>
        <div className="flex items-center gap-2 mt-3">
          <Input
            type="color"
            value={localColor}
            onChange={handleColorChange}
            disabled={!isVisible}
            className={clsx(
              'h-8 w-8 cursor-pointer rounded border border-white/10 bg-white/5 p-0 appearance-none focus:outline-none',
              !isVisible && 'opacity-50 cursor-not-allowed'
            )}
          />
          <Input
            type="text"
            value={localColor}
            onChange={handleColorChange}
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

export default Profile;