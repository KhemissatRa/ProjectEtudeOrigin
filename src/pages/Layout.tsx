import { useDispatch, useSelector, useStore } from 'react-redux';
import { RootState } from '../store';
import {
  setOrientation,
  setLayout,
  setMargin,
  setBackgroundColor,
  setBorderThickness,
  setBorderColor,
  LAYOUT_TEMPLATES,
  Orientation,
  LayoutTemplate,
} from '../store/layoutSlice';
import { Radio, RadioGroup, Field, Input, Label } from '@headlessui/react';
import clsx from 'clsx';
import { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash.debounce';
import throttle from 'lodash.throttle';
import { useTranslation } from 'react-i18next';
import { addPosterToCart } from '../store/cartSlice';
import CartLoaderOverlay from '../components/CartLoaderOverlay';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  mapEditorRef: any;
}

const Layout: React.FC<LayoutProps> = ({ mapEditorRef }) => {
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  const { orientation, selectedLayoutId, margins, backgroundColor, border } = useSelector(
    (state: RootState) => state.layout
  );
  const { t } = useTranslation();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const navigate = useNavigate();
  const labels = useSelector((state: RootState) => state.labels);
  const points = useSelector((state: RootState) => state.points.points);
  const layout = useSelector((state: RootState) => state.layout);
  const map = useSelector((state: RootState) => state.map);
  const trace = useSelector((state: RootState) => state.trace);
  const profile = useSelector((state: RootState) => state.profile);
  const product = useSelector((state: RootState) => state.product);
  const activities = useSelector((state: RootState) => state.activities.activities);
  const activeActivityIds = useSelector((state: RootState) => state.activities.activeActivityIds);

  const [localBgColor, setLocalBgColor] = useState(backgroundColor);
  const [localBorderColor, setLocalBorderColor] = useState(border.color);

  const throttleSetLocalBgColor = useCallback(
    throttle((color: string) => {
      setLocalBgColor(color);
    }, 100, { leading: true, trailing: true }),
    []
  );

  const throttleSetLocalBorderColor = useCallback(
    throttle((color: string) => {
      setLocalBorderColor(color);
    }, 100, { leading: true, trailing: true }),
    []
  );

  const debouncedDispatchBgColor = useCallback(
    debounce((newColor: string) => {
      const currentState = store.getState().layout;
      if (newColor !== currentState.backgroundColor) {
        console.log('(Debounced) Dispatching background color:', newColor);
        dispatch(setBackgroundColor(newColor));
      }
    }, 800),
    [dispatch, store]
  );

  const debouncedDispatchBorderColor = useCallback(
    debounce((newColor: string) => {
      const currentState = store.getState().layout;
      if (newColor !== currentState.border.color) {
        console.log('(Debounced) Dispatching border color:', newColor);
        dispatch(setBorderColor(newColor));
      }
    }, 800),
    [dispatch, store]
  );

  // Gestion du changement de marge
  const handleMarginChange = (side: keyof typeof margins, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      dispatch(setMargin({ side, value: numValue }));
    }
  };

  const handleBorderThicknessChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      dispatch(setBorderThickness(numValue));
    }
  };

  const handleBgColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    throttleSetLocalBgColor(newColor);
    debouncedDispatchBgColor(newColor);
  };

  const handleBorderColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    throttleSetLocalBorderColor(newColor);
    debouncedDispatchBorderColor(newColor);
  };

  useEffect(() => {
    if (backgroundColor !== localBgColor) {
      setLocalBgColor(backgroundColor);
    }
  }, [backgroundColor]);

  useEffect(() => {
    if (border.color !== localBorderColor) {
      setLocalBorderColor(border.color);
    }
  }, [border.color]);

  useEffect(() => {
    return () => {
      debouncedDispatchBgColor.cancel();
      debouncedDispatchBorderColor.cancel();
      throttleSetLocalBgColor.cancel();
      throttleSetLocalBorderColor.cancel();
    };
  }, [
    debouncedDispatchBgColor,
    debouncedDispatchBorderColor,
    throttleSetLocalBgColor,
    throttleSetLocalBorderColor,
  ]);

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
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-semibold font-sans">{t('layout.title')}</h1>
        <p className="text-gray-400 font-light text-sm">
          {t('layout.subtitle')}
        </p>
      </div>

      {/* Orientation */}
      <Field>
        <Label className="text-sm font-medium">{t('layout.orientation')}</Label>
        <RadioGroup
          value={orientation}
          onChange={(value: Orientation) => dispatch(setOrientation(value))}
          className="space-y-2 mt-3"
        >
          <div className="grid grid-cols-2 gap-2">
            {(['Portrait', 'Paysage'] as Orientation[]).map((option) => (
              <Radio
                key={option}
                value={option}
                className={({ checked }) =>
                  clsx(
                    'cursor-pointer rounded-lg p-3 text-center text-sm font-medium bg-white/5',
                    checked && 'ring-2 ring-blue-500 bg-white/10',
                    'focus:outline-none data-[focus]:outline-1 data-[focus]:outline-white'
                  )
                }
              >
                {option === 'Portrait' ? t('layout.portrait') : t('layout.landscape')}
              </Radio>
            ))}
          </div>
        </RadioGroup>
      </Field>

      {/* Layout Templates */}
      <Field>
        <Label className="text-sm font-medium">{t('layout.style')}</Label>
        <RadioGroup
          value={selectedLayoutId}
          onChange={(id: string) => dispatch(setLayout(id))}
          className="space-y-2 mt-3"
        >
          <div className="grid grid-cols-3 gap-2">
            {LAYOUT_TEMPLATES.map((template: LayoutTemplate) => {
              return (
                <Radio
                  key={template.id}
                  value={template.id}
                  className={({ checked }) =>
                    clsx(
                      'relative flex cursor-pointer rounded-lg p-1 focus:outline-none aspect-w-3 aspect-h-4',
                      'border',
                      checked
                        ? 'border-blue-500 ring-2 ring-offset-2 ring-offset-gray-900 ring-blue-500 bg-[#111]'
                        : 'border-gray-600 bg-[#222] hover:bg-[#111]'
                    )
                  }
                  aria-label={template.id}
                >
                  <img className="w-full h-full object-cover" src={`/layouts/${template.id}.png`} alt={template.id} />
                </Radio>
              );
            })}
          </div>
        </RadioGroup>
      </Field>

      {/* Marges */}
      <Field>
        <Label className="text-sm font-medium">{t('layout.margins')}</Label>
        <div className="grid grid-cols-4 gap-2 mt-3">
          {(['top', 'right', 'bottom', 'left'] as (keyof typeof margins)[]).map((side) => (
            <div key={side}>
              <Label className="text-xs capitalize text-gray-400">
                {side === "top"
                  ? t('layout.top')
                  : side === "right"
                  ? t('layout.right')
                  : side === "bottom"
                  ? t('layout.bottom')
                  : t('layout.left')}
              </Label>
              <Input
                type="number"
                min="0"
                value={margins[side]}
                onChange={(e) => handleMarginChange(side, e.target.value)}
                className={clsx(
                  "mt-1 block w-full rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6",
                  "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25"
                )}
              />
            </div>
          ))}
        </div>
      </Field>

      {/* Couleur de fond */}
      <Field>
        <Label className="text-sm font-medium">{t('layout.background_color')}</Label>
        <div className="flex items-center gap-2 mt-3">
          <Input
            type="color"
            value={localBgColor}
            onChange={handleBgColorChange}
            className="h-8 w-8 cursor-pointer rounded border border-white/10 bg-white/5 p-0 appearance-none focus:outline-none"
          />
          <Input
            type="text"
            value={localBgColor}
            onChange={handleBgColorChange}
            className={clsx(
              "block w-full rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6",
              "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25"
            )}
          />
        </div>
      </Field>

      {/* Bordures */}
      <Field>
        <Label className="text-sm font-medium">{t('layout.border')}</Label>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <Label className="text-xs text-gray-400">{t('layout.thickness')}</Label>
            <Input
              type="number"
              min="0"
              value={border.thickness}
              onChange={(e) => handleBorderThicknessChange(e.target.value)}
              className={clsx(
                "mt-1 block w-full rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6",
                "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25"
              )}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-400">{t('layout.color')}</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="color"
                value={localBorderColor}
                onChange={handleBorderColorChange}
                className="h-8 w-8 cursor-pointer rounded border border-white/10 bg-white/5 p-0 appearance-none focus:outline-none"
              />
              <Input
                type="text"
                value={localBorderColor}
                onChange={handleBorderColorChange}
                className={clsx(
                  "block w-full rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6",
                  "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25"
                )}
              />
            </div>
          </div>
        </div>
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

export default Layout;