import React from "react";
import { MoonLoader } from "react-spinners";
import { createPortal } from "react-dom";

interface CartLoaderOverlayProps {
  message?: string;
}

const CartLoaderOverlay: React.FC<CartLoaderOverlayProps> = ({ message }) => {
  // Retire le focus de l'élément actif quand l'overlay apparaît
  React.useEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    // Désactive le scroll du body à l’apparition
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "#1e2027", // Couleur foncée, modifiable selon ton branding
        zIndex: 99999,
        display: "flex",
        
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity 0.3s",
      }}
      aria-modal="true"
      role="alertdialog"
    >
      <MoonLoader color="#fff" size={56} speedMultiplier={0.8} />
      <div
        style={{
          marginTop: 32,
          color: "#fff",
          fontWeight: 600,
          fontSize: 22,
          letterSpacing: 0.2,
          textAlign: "center",
          fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
          textShadow: "0 2px 16px rgba(0,0,0,0.25)",
        }}
      >
        {message ||
          "Votre poster personnalisé est en cours de génération et d'ajout au panier..."}
      </div>
      <div
        style={{
          marginTop: 18,
          color: "#c9d1d9",
          fontSize: 15,
          textAlign: "center",
          maxWidth: 420,
        }}
      >
        Merci de patienter quelques instants pendant la préparation de votre fichier PDF haute qualité.
      </div>
    </div>,
    document.body
  );
};

export default CartLoaderOverlay;