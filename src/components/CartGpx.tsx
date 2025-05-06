import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Define proper types for GPX
interface GPXOptions {
  async: boolean;
  marker_options: {
    startIconUrl: string;
    endIconUrl: string;
    shadowUrl: string;
  };
}

interface GPXEvent {
  target: {
    getBounds: () => L.LatLngBounds;
  };
}

interface GPXLayer extends L.Layer {
  on(event: string, callback: (e: GPXEvent) => void): this;
  addTo(map: L.Map): this;
}

interface GPXConstructor {
  new (url: string, options: GPXOptions): GPXLayer;
}

declare global {
  interface Window {
    L: typeof L & {
      GPX?: GPXConstructor;
    };
  }
}

const MapWithGPX = () => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const loadGPXPlugin = () => {
      return new Promise<void>((resolve) => {
        if (window.L && window.L.GPX) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet-gpx/1.7.0/gpx.min.js';
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    };

    const initializeMap = async () => {
      await loadGPXPlugin();

      if (!mapContainerRef.current || !window.L.GPX) return;

      // Clean up existing map if it exists
      if (mapRef.current) {
        mapRef.current.remove();
      }

      // Initialize map
      const map = L.map(mapContainerRef.current).setView([48.8566, 2.3522], 13);
      mapRef.current = map;

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      // Add GPX track
      const gpxUrl = "/marathon-pariss.gpx";
 // Adjust the path to your GPX file
      const gpxTrack = new window.L.GPX(gpxUrl, {
        async: true,
        marker_options: {
          startIconUrl: "https://leafletjs.com/examples/custom-icons/leaf-green.png",
          endIconUrl: "https://leafletjs.com/examples/custom-icons/leaf-red.png",
          shadowUrl: "https://leafletjs.com/examples/custom-icons/leaf-shadow.png",
        },
      });

      gpxTrack.on("loaded", (e: GPXEvent) => {
        map.fitBounds(e.target.getBounds());
      });

      gpxTrack.addTo(map);
    };

    initializeMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return <div ref={mapContainerRef} style={{ height: "450px", width: "90%" }} />;
};

export default MapWithGPX;


