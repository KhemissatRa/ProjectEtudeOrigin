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

const Layout = () => {
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  const { orientation, selectedLayoutId, margins, backgroundColor, border } = useSelector(
    (state: RootState) => state.layout
  );

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

  return (
    <div className="space-y-6 p-1 text-white">
      {/* Header */}
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-semibold font-sans">Disposition</h1>
        <p className="text-gray-400 font-light text-sm">
          Choisissez la disposition de votre affiche.
        </p>
      </div>

      {/* Orientation */}
      <Field>
        <Label className="text-sm font-medium">Orientation</Label>
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
                {option}
              </Radio>
            ))}
          </div>
        </RadioGroup>
      </Field>

      {/* Layout Templates */}
      <Field>
        <Label className="text-sm font-medium">Style de disposition</Label>
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
        <Label className="text-sm font-medium">Marges (pixels)</Label>
        <div className="grid grid-cols-4 gap-2 mt-3">
          {["top", "right", "bottom", "left"].map((side) => (
            <div key={side}>
              <Label className="text-xs capitalize text-gray-400">
                {side === "top"
                  ? "Haut"
                  : side === "right"
                  ? "Droite"
                  : side === "bottom"
                  ? "Bas"
                  : "Gauche"}
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
        <Label className="text-sm font-medium">Couleur de fond</Label>
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
        <Label className="text-sm font-medium">Bordure</Label>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <Label className="text-xs text-gray-400">Épaisseur (px)</Label>
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
            <Label className="text-xs text-gray-400">Couleur</Label>
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

      {/* Bouton Suivant (Optionnel ici, dépend du flux) */}
      {/* <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md mt-4">Suivant</button> */}
    </div>
  );
};

export default Layout;