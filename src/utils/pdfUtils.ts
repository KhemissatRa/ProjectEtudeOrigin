import jsPDF from "jspdf";
import { RefObject } from "react";
import html2canvas from "html2canvas-pro";
import { Map as MapboxMap } from "mapbox-gl";

/**
 * Exporte l'élément HTML référencé en tant que fichier PDF.
 * Capture l'élément entier avec html2canvas et remplace la partie carte par le canevas Mapbox.
 * @param elementRef Référence au conteneur principal (div) à exporter.
 * @param mapContainerRef Référence au conteneur de la carte.
 * @param mapInstanceRef Référence à l'instance Mapbox (via RefObject).
 * @returns Une promesse résolue avec le Blob PDF, ou null en cas d'erreur.
 */
export const exportPdf = async (
  elementRef: RefObject<HTMLDivElement | null>,
  mapContainerRef: RefObject<HTMLDivElement | null>,
  mapInstanceRef: RefObject<MapboxMap | null>
): Promise<Blob | null> => {
  const element = elementRef.current;
  const mapContainer = mapContainerRef.current;
  const map = mapInstanceRef.current;

  if (!element) {
    console.error("PDF Export Error: elementRef.current is null.");
    return null;
  }
  if (!mapContainer) {
    console.error("PDF Export Error: mapContainerRef.current is null.");
    return null;
  }
  if (!map) {
    console.error("PDF Export Error: mapInstanceRef.current (map) is null.");
    return null;
  }

  console.log("Starting PDF export process (High Quality)...");

  const targetDpi = 300;
  const originalPixelRatio = window.devicePixelRatio;
  // Ensure we have a finally block to restore the pixel ratio
  try {
    // Override devicePixelRatio for high-res capture
    const calculatedPixelRatio = targetDpi / 96;
    console.log(`Overriding devicePixelRatio to ${calculatedPixelRatio} (for DPI ${targetDpi})`);
    Object.defineProperty(window, 'devicePixelRatio', {
      value: calculatedPixelRatio,
      writable: true // Make it writable to restore later
    });

    // Calculate the scale factor for html2canvas
    const scale = calculatedPixelRatio;

    // Avant la capture
    const controls = Array.from(document.querySelectorAll('.mapboxgl-ctrl-top-right, .mapboxgl-ctrl-bottom-right, .mapboxgl-ctrl')) as HTMLElement[];
    const previousDisplays = controls.map(el => el.style.display);
    controls.forEach(el => { el.style.display = 'none'; });

    // Capture the entire component with html2canvas at high resolution
    console.log("Capturing element with html2canvas at high resolution...");
    const capturedCanvas = await html2canvas(element, {
      scale: scale, // Use the calculated scale
      useCORS: true,
      logging: true, // Keep logging enabled
      // backgroundColor: null, // Use transparent background if needed, or element's actual background
      allowTaint: false,
    });
    console.log(
      `Canvas captured with html2canvas. Dimensions: ${capturedCanvas.width} x ${capturedCanvas.height}`
    );

    // Après la capture, restaure l'affichage
    controls.forEach((el, i) => { el.style.display = previousDisplays[i]; });

    // Check the captured canvas
    if (!capturedCanvas || capturedCanvas.width === 0 || capturedCanvas.height === 0) {
      console.error("Captured canvas is invalid or empty.");
      throw new Error("Captured canvas invalid"); // Throw to ensure finally block runs
    }

    // Retrieve the Mapbox map canvas (should also be high-res now)
    console.log("Attempting to retrieve Mapbox canvas (expecting map to be idle and high-res)...");
    // if (!map.isStyleLoaded()) { // Already checked in caller, but double check doesn't hurt
    //   console.error("Map style not loaded even after idle event.");
    //   throw new Error("Map style not loaded");
    // }

    map.triggerRepaint(); // Force a final redraw
    // Give slightly more time for high-res repaint
    await new Promise(resolve => setTimeout(resolve, 150)); 

    let mapCanvas: HTMLCanvasElement | null = null;
    try {
      mapCanvas = map.getCanvas();
      if (!mapCanvas) {
        console.error("map.getCanvas() returned null even after idle event.");
        throw new Error("Failed to get map canvas");
      }
      console.log(`Successfully retrieved Mapbox canvas. Dimensions: ${mapCanvas.width} x ${mapCanvas.height}`);
    } catch (getCanvasError) {
      console.error("Error calling map.getCanvas() after idle event:", getCanvasError);
      throw getCanvasError; // Re-throw to ensure finally block runs
    }

    // Calculate position and size of the map container within the captured canvas
    // Use scaled coordinates for drawing onto the high-res capturedCanvas.
    const mapRect = mapContainer.getBoundingClientRect();
    const containerRect = element.getBoundingClientRect();
    const mapLeftInCanvas = (mapRect.left - containerRect.left) * scale;
    const mapTopInCanvas = (mapRect.top - containerRect.top) * scale;
    const mapWidthInCanvas = mapRect.width * scale;
    const mapHeightInCanvas = mapRect.height * scale;

    console.log(
      `Map position in high-res canvas: (${mapLeftInCanvas}, ${mapTopInCanvas}), Size: ${mapWidthInCanvas}x${mapHeightInCanvas}`
    );

    // Modify the captured canvas to include the map canvas
    const ctx = capturedCanvas.getContext("2d");
    if (!ctx) {
      console.error("Unable to get 2D context from captured canvas.");
      throw new Error("Failed to get 2D context");
    }

    // === TEMPORAIREMENT COMMENTÉ POUR DIAGNOSTIC ===
    /*
    // Draw the high-res map canvas onto the high-res captured canvas
    try {
      console.log("Drawing high-res map canvas onto high-res captured canvas...");
      // Draw source map over the destination area
      ctx.drawImage(
        mapCanvas, // Source map canvas (high-res)
        0, 0, mapCanvas.width, mapCanvas.height, // Source rect (full map canvas)
        mapLeftInCanvas, mapTopInCanvas, mapWidthInCanvas, mapHeightInCanvas // Destination rect (scaled position/size)
      );
      console.log("High-res map canvas drawn onto captured canvas.");
    } catch (drawError) {
      console.error("Error drawing Mapbox canvas onto main canvas:", drawError);
      throw drawError; // Throw error if drawing fails
    }
    */
    console.log("Map canvas drawing onto captured canvas is temporarily disabled for diagnosis.")
    // ==============================================

    // Create the PDF using the high-resolution canvas dimensions
    console.log(`Creating PDF with dimensions: ${capturedCanvas.width}px x ${capturedCanvas.height}px`);
    const pdf = new jsPDF({
      orientation: capturedCanvas.width > capturedCanvas.height ? "landscape" : "portrait",
      unit: "px", // Use pixels for direct mapping from canvas
      format: [capturedCanvas.width, capturedCanvas.height],
      compress: false // Try disabling compression for max quality
    });

    // Add the modified high-res canvas image to the PDF
    const imgData = capturedCanvas.toDataURL("image/png"); // Use PNG
    // Use 'NONE' compression for addImage if available and desirable, else try 'FAST' or default
    pdf.addImage(imgData, "PNG", 0, 0, capturedCanvas.width, capturedCanvas.height, undefined, 'NONE'); // Try 'NONE' compression
    console.log("High-res image added to PDF. Generating Blob...");

    // Retourner le Blob au lieu de sauvegarder
    const pdfBlob = pdf.output('blob');
    console.log("PDF Blob generated successfully.");
    return pdfBlob;

  } catch (error) {
      console.error("Detailed error during High Quality PDF export:", error);
      alert(`An error occurred during PDF generation: ${error instanceof Error ? error.message : String(error)}`);
      return null; // Retourner null en cas d'erreur
  } finally {
    // IMPORTANT: Restore original devicePixelRatio
    console.log(`Restoring original devicePixelRatio: ${originalPixelRatio}`);
    Object.defineProperty(window, 'devicePixelRatio', {
      value: originalPixelRatio,
      writable: true // Ensure it remains writable if needed elsewhere
    });
  }
};