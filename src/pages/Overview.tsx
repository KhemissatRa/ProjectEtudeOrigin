import React, { useRef, useState } from 'react';
import { NavLink, useNavigate } from "react-router-dom";
import { HiUpload, HiTemplate } from "react-icons/hi";
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { addPosterToCart, CartItem } from '../store/cartSlice';
import EditorPreview, { EditorPreviewRef } from '../components/EditorPreview';
import CartLoaderOverlay from '../components/CartLoaderOverlay';
import { exportPdf } from '../utils/pdfUtils';
import { store } from '../store';
import { setZoomLevel } from '../store/zoomSlice';
import { Map as MapboxMap } from 'mapbox-gl';

interface OverviewProps {
  editorPreviewRef: React.RefObject<EditorPreviewRef>;
}

// Helper pour générer un ID unique
const generateCartItemId = () => `cart-${Date.now()}-${Math.random().toString(16).substring(2, 8)}`;

// Helper pour attendre l'état idle (avec fallback pro)
const waitForMapIdle = (map: MapboxMap, timeoutMs = 10000): Promise<void> => {
  return new Promise((resolve, reject) => {
    let done = false;
    const timeoutId = setTimeout(() => {
      if (!done) {
        done = true;
        map.off('idle', onIdle);
        console.warn(`Map did not become idle within the timeout period (${timeoutMs}ms). Proceeding anyway.`);
        resolve(); // Fallback : on continue même si la carte n'est pas idle
      }
    }, timeoutMs);

    const onIdle = () => {
      if (!done) {
        done = true;
        clearTimeout(timeoutId);
        resolve();
      }
    };
    map.on('idle', onIdle);
    setTimeout(() => map.resize(), 50);
  });
};

// Conversion DataURL -> Blob
function dataUrlToBlob(dataUrl: string) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

const Overview: React.FC<OverviewProps> = ({ editorPreviewRef }) => {
  const navigate = useNavigate();
  const dispatch: AppDispatch = useDispatch();
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false); // Garder cet état
  const [uploadProgress, setUploadProgress] = useState<number | null>(null); // Pour suivre l'upload
  const labels = useSelector((state: RootState) => state.labels);
  const points = useSelector((state: RootState) => state.points.points);
  const layout = useSelector((state: RootState) => state.layout);
  const map = useSelector((state: RootState) => state.map);
  const trace = useSelector((state: RootState) => state.trace);
  const profile = useSelector((state: RootState) => state.profile);
  const product = useSelector((state: RootState) => state.product);
  const activities = useSelector((state: RootState) => state.activities);
  const currentPrice = product.currentPrice;

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const handleAddToCart = async () => {
    if (!editorPreviewRef.current || !editorPreviewRef.current.mapInstanceRef?.current) {
        console.error("EditorPreview ref or map instance is not available");
        alert("Erreur: Impossible d'accéder à l'éditeur ou à la carte.");
        return;
    }
    const mapInstance = editorPreviewRef.current.mapInstanceRef.current;
    
    const originalZoom = store.getState().zoom.selectedZoom;

    setIsAddingToCart(true);
    setIsGeneratingPreview(true); 
    setUploadProgress(null); 
    let thumbnailUrl: string | null = null;
    let pdfBlob: Blob | null = null;
    let exportSuccess = false;

    try {
        console.log("Forcing zoom to 100% for export (Overview)...");
        dispatch(setZoomLevel('100%'));

        console.log("Waiting briefly for React re-render after zoom change (Overview)...");
        await new Promise(resolve => setTimeout(resolve, 100)); 

        console.log("Waiting for map to become idle after zoom change (Overview)...");
        await waitForMapIdle(mapInstance);

        console.log("Map is idle, waiting a bit longer for final stabilization (Overview)...");
        await new Promise(resolve => setTimeout(resolve, 300)); // Délai supplémentaire de 300ms

        // Délai additionnel long pour garantir que tout est prêt (layout, fond, etc.)
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 secondes (augmente si besoin)

        console.log("Proceeding with export generation (Overview)...");
        // Génération Aperçu strictement après stabilisation
        try {
            editorPreviewRef.current.containerRef?.current?.classList.add('is-exporting');
            thumbnailUrl = await editorPreviewRef.current.generatePreviewImage();
            console.log("Aperçu généré (Overview, 100%):", thumbnailUrl ? "Succès" : "Échec");
        } catch (error) {
            console.error("Failed to generate preview image (at 100%):", error);
        } finally {
            editorPreviewRef.current.containerRef?.current?.classList.remove('is-exporting');
            setIsGeneratingPreview(false);
        }

        // Génération PDF
        console.log("Démarrage génération PDF à 100% (Overview)...");
        if (!editorPreviewRef.current?.containerRef || !editorPreviewRef.current?.mapContainerRef) {
            throw new Error("Références container ou mapContainer non trouvées pour l'export PDF.");
        }
        pdfBlob = await exportPdf(
            editorPreviewRef.current.containerRef,  
            editorPreviewRef.current.mapContainerRef,
            editorPreviewRef.current.mapInstanceRef 
        );
        if (!pdfBlob) {
             throw new Error("La génération du PDF a échoué (blob nul).");
        }
        console.log("PDF Blob généré avec succès à 100% (Overview).", pdfBlob);
        exportSuccess = true;

        // Upload et Ajout Panier si succès
        if (exportSuccess) {
            const cartItemId = generateCartItemId();
            console.log(`Generated Cart Item ID: ${cartItemId}. Début upload PDF...`);
            setUploadProgress(0); 

            const formData = new FormData();
            formData.append('file', pdfBlob, `poster-${cartItemId}.pdf`);
            if (thumbnailUrl) {
              const previewBlob = dataUrlToBlob(thumbnailUrl);
              formData.append('previewImage', previewBlob, `preview-${cartItemId}.png`);
            }
            formData.append('cartItemId', cartItemId);

            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `${backendUrl}/api/upload-pdf-with-preview`, true);
                
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = Math.round((event.loaded / event.total) * 100);
                        setUploadProgress(percentComplete);
                    }
                };

                xhr.onload = () => {
                    setUploadProgress(100);
                    if (xhr.status >= 200 && xhr.status < 300) {
                        console.log(`Upload PDF + preview pour ${cartItemId} réussi.`);
                        resolve();
                    } else {
                        console.error(`Erreur ${xhr.status} lors de l'upload: ${xhr.responseText}`);
                        reject(new Error(`Erreur serveur lors de l'upload: ${xhr.statusText || xhr.status}`));
                    }
                };

                xhr.onerror = () => {
                    console.error('Erreur réseau lors de l\'upload du PDF.');
                    reject(new Error('Erreur réseau lors de l\'upload.'));
                };

                xhr.send(formData);
            });

            console.log(`Ajout au panier local pour ${cartItemId}...`);
            const { currentPrice: _, ...productDetails } = product;
            const productForCart: CartItem['posterConfiguration']['product'] = {
                ...productDetails,
                price: currentPrice,
            };
            const posterConfiguration: CartItem['posterConfiguration'] = {
              labels, points, layout, map, trace, profile, product: productForCart, 
              activeActivityIds: activities.activeActivityIds, activitiesData: activities.activities,
            };

            dispatch(addPosterToCart({ 
                id: cartItemId,
                configuration: posterConfiguration,
                thumbnailUrl: thumbnailUrl ?? undefined 
            }));
            console.log('Poster ajouté au panier local:', cartItemId);
            navigate('/cart');
        }

    } catch (error) {
        console.error('Erreur globale lors de l\'ajout au panier (Overview):', error);
        alert(`Une erreur s'est produite : ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
        console.log("Restoring original zoom level (Overview):", originalZoom);
        dispatch(setZoomLevel(originalZoom));
        setIsAddingToCart(false);
        setUploadProgress(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Overlay loader */}
      {isAddingToCart && <CartLoaderOverlay message={isGeneratingPreview ? "Génération de l'aperçu et PDF..." : uploadProgress !== null ? `Upload du PDF (${uploadProgress}%)...` : "Ajout au panier..."} />}
      <div className="space-y-1">
        <div className="font-sans font-bold text-white">Overview</div>
        <div className="mt-1 text-gray-400 font-light text-sm">
          Créez un beau poster de votre activité
        </div>
      </div>
      <div className="space-y-4">
        <NavLink
          to={"/activities"}
          className="w-full cursor-pointer flex justify-center items-center space-x-2 bg-[#333333] hover:bg-[#444444] text-white text-sm py-2 rounded-sm"
        >
          <HiUpload />
          <span>Télécharger une activité</span>
        </NavLink>
        <NavLink
          to={"/templates"}
          className="w-full cursor-pointer flex justify-center items-center space-x-2 bg-[#333333] hover:bg-[#444444] text-white text-sm py-2 rounded-sm"
        >
          <HiTemplate />
          <span>Changer de modèle</span>
        </NavLink>
      </div>
      <div className="space-y-4">
        <div className="text-white font-sans font-medium">
          Personnalisez votre poster
        </div>
        <div className="space-y-2">
          <NavLink
            to={"/points"}
            className="w-full text-sm cursor-pointer flex items-center space-x-2 py-2 px-4 rounded-sm hover:bg-[#2A2A2A]"
          >
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.243l-4.243-4.243m0 0L9.172 7.757M13.414 12H21m-7.586 4.243l4.243 4.243M6.343 17.657l-4.243-4.243M6.343 17.657l4.243-4.243M3 21v-7.586"
              />
            </svg>
            <span className="text-gray-400 font-light">Points d'intérêt</span>
          </NavLink>
          <NavLink
            to={"/labels"}
            className="w-full text-sm cursor-pointer flex items-center space-x-2 py-2 px-4 rounded-sm hover:bg-[#2A2A2A]"
          >
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4h13M3 4v16M3 4l4 4M16 4l-4 4M16 4v16m-4-8h9"
              />
            </svg>
            <span className="text-gray-400 font-light">Étiquettes</span>
          </NavLink>
          <NavLink
            to={"/layout"}
            className="w-full text-sm cursor-pointer flex items-center space-x-2 py-2 px-4 rounded-sm hover:bg-[#2A2A2A]"
          >
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h18M3 9h18M3 15h18M3 21h18"
              />
            </svg>
            <span className="text-gray-400 font-light">Disposition</span>
          </NavLink>
          <NavLink
            to={"/map"}
            className="w-full text-sm cursor-pointer flex items-center space-x-2 py-2 px-4 rounded-sm hover:bg-[#2A2A2A]"
          >
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A2 2 0 013 15.382V5.618a2 2 0 011.447-1.894L9 2m0 18l6-3m-6 3V2m6 15l5.447 2.724A2 2 0 0021 19.382V9.618a2 2 0 00-1.447-1.894L15 6m0 11V2m0 0l-6 3"
              />
            </svg>
            <span className="text-gray-400 font-light">Carte</span>
          </NavLink>
          {/* <NavLink
            to={"/sizes"}
            className="w-full text-sm cursor-pointer flex items-center space-x-2 py-2 px-4 rounded-sm hover:bg-[#2A2A2A]"
          >
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0H8M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 0h-4"
              />
            </svg>
            <span className="text-gray-400 font-light">Taille</span>
          </NavLink> */}
        </div>
      </div>
      <button
        onClick={handleAddToCart} 
        disabled={isAddingToCart}
        className="w-full text-sm cursor-pointer flex justify-center items-center space-x-2 bg-orange-500 hover:opacity-75 text-white py-2 rounded-sm disabled:opacity-50 disabled:cursor-wait"
      >
        {isAddingToCart ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {isGeneratingPreview 
              ? <span>Génération de l'aperçu...</span> 
              : uploadProgress !== null 
                ? <span>Upload du PDF ({uploadProgress}%)...</span> 
                : <span>Ajout au panier...</span>}
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
            <span>Ajouter au panier</span>
          </>
        )}
      </button>
    </div>
  );
};

export default Overview;