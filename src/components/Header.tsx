import clsx from "clsx";
import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@headlessui/react";
import { Tooltip } from "react-tooltip";
import { FaUndo } from "react-icons/fa";
import Hamburger from "hamburger-react";
import { HiRefresh, HiShoppingCart } from "react-icons/hi";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { ZoomLevel, ZOOM_OPTIONS } from "../utils/zoomUtils";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { resetMapControls } from "../store/mapSlice";
import { resetLayout, setOrientation, Orientation } from "../store/layoutSlice";
import { resetTraceStyle } from "../store/traceSlice";
import { resetProfileSettings } from "../store/profileSlice";
import { resetProductConfiguration } from "../store/productSlice";
import { clearPoints, initializePoints } from "../store/pointsSlice";
import { initializeLabels } from "../store/labelsSlice";
import { setZoomLevel, selectSelectedZoom } from "../store/zoomSlice";
// Consider a combined reset action if needed

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const Header = ({
  toggleSidebar,
  isSidebarOpen,
}: HeaderProps) => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const cartItemCount = useSelector((state: RootState) => state.cart.items.length);
  // Get active activities to re-initialize points/labels on reset
  const activities = useSelector((state: RootState) => state.activities.activities);
  const activeActivityIds = useSelector((state: RootState) => state.activities.activeActivityIds);
  const selectedZoom = useSelector(selectSelectedZoom);
  const currentOrientation = useSelector((state: RootState) => state.layout.orientation);

  const handleRotate = () => {
      const nextOrientation: Orientation = currentOrientation === 'Portrait' ? 'Landscape' : 'Portrait';
      dispatch(setOrientation(nextOrientation));
  };

  const handleReset = () => {
      // Dispatch reset actions for relevant slices
      dispatch(resetMapControls());
      dispatch(resetLayout());
      dispatch(resetTraceStyle());
      dispatch(resetProfileSettings());
      dispatch(resetProductConfiguration());
      dispatch(initializeLabels()); // Reset labels to default

      // Re-initialize points based on currently active activities
      const activeActivitiesData = activities.filter(act => activeActivityIds.includes(act.id));
      dispatch(clearPoints()); // Clear existing points first
      dispatch(initializePoints(activeActivitiesData)); // Re-initialize

      // Optionally reset zoom to default via slice
      dispatch(setZoomLevel('Fit to screen'));

      // Optionally reset sidebar state?
      // if (!isSidebarOpen) dispatch(toggleSidebar());
       console.log("Réglages réinitialisés");
  };

  const handleZoomChange = (newZoom: ZoomLevel) => {
      dispatch(setZoomLevel(newZoom));
  };

  return (
    <header className="bg-[#222] w-full text-white border-b border-[#333] h-[61px] z-50 p-4 flex items-center justify-between flex-shrink-0">
      {/* Logo et bouton toggle */}
      <div className="flex items-center space-x-1">
        <NavLink to={"/"} className="text-lg font-sans font-bold">
          RUNMEMORIES
        </NavLink>
        <Hamburger
          toggled={isSidebarOpen}
          toggle={toggleSidebar}
          size={20}
          easing="ease-in"
          duration={0.2}
        />
      </div>

       {/* Centre : Zoom, Rotation, Réinitialiser */}
      <div className="flex items-center space-x-4">
        {/* Sélecteur de zoom */}
        <div className="w-42">
          <Listbox value={selectedZoom} onChange={handleZoomChange}>
            <ListboxButton
              className={clsx(
                "relative block w-full rounded-lg bg-[#333] py-1.5 pr-8 pl-3 text-left text-sm/6 text-white",
                "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25"
              )}
            >
              {selectedZoom === 'Fit to screen' ? "Ajuster à l'écran" : selectedZoom}
              <ChevronDownIcon
                className="group pointer-events-none absolute top-2.5 right-2.5 size-4 fill-white/60"
                aria-hidden="true"
              />
            </ListboxButton>
            <ListboxOptions
              anchor="bottom"
              transition
              className={clsx(
                "w-[var(--button-width)] z-[100] mt-1 rounded-xl border border-white/5 bg-[#333] p-1 [--anchor-gap:var(--spacing-1)] focus:outline-none",
                "transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0"
              )}
            >
              {ZOOM_OPTIONS.map((size) => (
                <ListboxOption
                  key={size}
                  value={size}
                  className="group flex cursor-default items-center gap-2 rounded-lg py-1.5 px-3 select-none data-[focus]:bg-white/10"
                >
                  <CheckIcon className="invisible size-4 fill-white group-data-[selected]:visible" />
                  <div className="text-sm/6 text-white">{size === 'Fit to screen' ? 'Ajuster à l\'écran' : size}</div>
                </ListboxOption>
              ))}
            </ListboxOptions>
          </Listbox>
        </div>
        {/* Bouton rotation */}
        <Button
          onClick={handleRotate}
          data-tooltip-id="rotate-tooltip"
          data-tooltip-content="Faire pivoter 90°"
          className="cursor-pointer w-8 h-8 flex items-center justify-center bg-[#333] hover:opacity-75 text-white p-2 rounded"
        >
          <HiRefresh className="w-4 h-4" />
        </Button>
        {/* Bouton réinitialiser */}
        <Button
          onClick={handleReset}
          data-tooltip-id="reset-tooltip"
          data-tooltip-content="Réinitialiser les réglages"
          className="cursor-pointer w-8 h-8 flex items-center justify-center bg-[#333] hover:opacity-75 text-white p-2 rounded"
        >
          <FaUndo className="w-3 h-3" />
        </Button>
      </div>

        {/* Actions droites : Panier */}
      <div className="flex items-center space-x-4">
         {/* Bouton panier */}
        <Button
          onClick={() => navigate('/cart')}
          data-tooltip-id="cart-tooltip"
          data-tooltip-content="Voir le panier"
          className="relative rounded cursor-pointer bg-[#333333] text-white h-8 w-8 flex items-center justify-center hover:opacity-75"
        >
          <HiShoppingCart className="w-4 h-4" />
           {/* Badge panier */}
          {cartItemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center leading-none">
              {cartItemCount}
            </span>
          )}
        </Button>
      </div>

      {/* Tooltips */}
      <Tooltip id="rotate-tooltip" place="bottom" style={{ backgroundColor: "#333", color: "#fff", zIndex: 9999 }} opacity={1} />
      <Tooltip id="reset-tooltip" place="bottom" style={{ backgroundColor: "#333", color: "#fff", zIndex: 9999 }} opacity={1} />
      <Tooltip id="cart-tooltip" place="bottom" style={{ backgroundColor: "#333", color: "#fff", zIndex: 9999 }} opacity={1} />
    </header>
  );
};

export default Header;