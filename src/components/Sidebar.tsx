import clsx from 'clsx';
import { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { Tooltip } from "react-tooltip";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  HiHome,
  HiUpload,
  HiTemplate,
  HiLocationMarker,
  HiTag,
  HiViewGrid, // Layout
  HiMap, // Map Style
  HiAdjustments, // Trace Style (alternative icon)
  HiChartBar, // Profile (alternative icon)
  HiArrowsExpand, // Size
  HiShoppingCart, // Cart
  HiUser // Placeholder for Profile if needed later
} from "react-icons/hi";

import Spinner from "../components/Spinner";
import ErrorBoundary from "../components/ErrorBoundary";
import AnimationLayout from "../components/AnimationLayout";

// Pages
import Overview from "../pages/Overview.tsx";
import Activities from "../pages/Activities.tsx";
import Points from "../pages/Points.tsx";
import Labels from "../pages/Labels.tsx";
import TemplatePage from "../pages/Template.tsx";
// --- New Pages ---
import Layout from "../pages/Layout.tsx";
import MapStyle from "../pages/MapStyle.tsx";
import Trace from "../pages/Trace.tsx";
import Profile from "../pages/Profile.tsx";
import Cart from "../pages/Cart.tsx";
import Checkout from "../pages/Checkout.tsx";
import Success from "../pages/Success.tsx";

interface SidebarProps {
  isSidebarOpen: boolean;
  mapEditorRef: any; // Pass ref if needed by child pages (Points currently uses it)
}

const Sidebar = ({ isSidebarOpen, mapEditorRef }: SidebarProps) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(isSidebarOpen);
  const location = useLocation(); // To handle active state for '/' and '/overview'

  // Use effect to handle sidebar visibility for animation
  useEffect(() => {
    if (isSidebarOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isSidebarOpen]);

  // Helper for NavLink class logic
  const getNavLinkClass = (path: string, isActive: boolean) => {
     // Special case for Overview to be active on '/' too
    const isOverviewActive = (path === "/overview" && (isActive || location.pathname === "/"));
    return clsx(
        'w-12 h-12 rounded flex items-center justify-center cursor-pointer',
        (isActive && path !== "/overview") || isOverviewActive ? 'bg-[#333333]' : 'hover:bg-[#2A2A2A]'
    );
  }

  const navItems = [
    { path: "/overview", icon: HiHome, label: "Accueil" },
    { path: "/activities", icon: HiUpload, label: "Activités" },
    { path: "/points", icon: HiLocationMarker, label: "Points" },
    { path: "/templates", icon: HiTemplate, label: "Modèles" },
    { path: "/labels", icon: HiTag, label: "Étiquettes" },
    { path: "/layout", icon: HiViewGrid, label: "Mise en page" },
    { path: "/map", icon: HiMap, label: "Carte" },
    { path: "/trace", icon: HiAdjustments, label: "Tracé" }, // Using Adjustments icon
    { path: "/profile", icon: HiChartBar, label: "Profil" }, // Using ChartBar icon
    // Cart link can be here or just in header
    // { path: "/cart", icon: HiShoppingCart, label: "Panier" },
  ];


  return (
    <aside
      ref={sidebarRef}
      className={`bg-[#222] min-w-[450px] w-[450px] max-w-[450px] pl-4 shadow-md flex flex-row gap-4 border-r border-[#333] h-[calc(100vh-61px)] transition-all duration-300 ease-in-out ${
        isSidebarOpen
          ? "translate-x-0 opacity-100"
          : "-translate-x-full opacity-0"
      } ${isVisible ? "block" : "absolute"}`} // Use absolute positioning when hidden to prevent layout shifts
    >
      {/* Navigation Icons */}
      <div className="py-4 pr-4 border-r border-[#333] overflow-y-auto scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-[#222] max-h-[calc(100vh-61px)]">
        <ul className="space-y-4">
          {navItems.map(item => (
             <li key={item.path}>
                <NavLink
                to={item.path}
                data-tooltip-id={`${item.label.toLowerCase()}-tooltip`}
                data-tooltip-content={item.label}
                className={({ isActive }) => getNavLinkClass(item.path, isActive)}
                >
                <item.icon className="w-6 h-6 text-white" />
                </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* Page Content Area */}
      <div className="flex-1 pr-4 py-8 overflow-y-auto scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-[#222] max-h-full"> {/* Changed max-h-screen to max-h-full */}
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <Spinner />
              </div>
            }
          >
            <Routes>
              <Route element={<AnimationLayout />}>
                {/* Existing Routes */}
                <Route path="/" element={<Overview editorPreviewRef={mapEditorRef} />} />
                <Route path="/overview" element={<Overview editorPreviewRef={mapEditorRef} />} />
                <Route path="/activities" element={<Activities />} />
                <Route path="/points" element={<Points mapEditorRef={mapEditorRef}/>}/>
                <Route path="/labels" element={<Labels/>}/>
                <Route path="/templates" element={<TemplatePage />} />
                {/* --- New Routes --- */}
                <Route path="/layout" element={<Layout />} />
                <Route path="/map" element={<MapStyle />} />
                <Route path="/trace" element={<Trace />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
               {/* Routes outside the main editor sidebar animation */}
               <Route path="/cart" element={<Cart />} />
               <Route path="/checkout" element={<Checkout />} />
               <Route path="/commande/succes" element={<Success />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Tooltips */}
      {navItems.map(item => (
         <Tooltip
            key={`${item.label.toLowerCase()}-tooltip`}
            id={`${item.label.toLowerCase()}-tooltip`}
            place="right"
            style={{ backgroundColor: "#333", color: "#fff", zIndex: 9999 }} // Ensure high z-index
            opacity={1}
         />
      ))}

    </aside>
  );
};

export default Sidebar;