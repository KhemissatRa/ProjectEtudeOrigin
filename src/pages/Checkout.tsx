import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { useNavigate } from 'react-router-dom';
import { startPaymentProcessing, paymentFailure, resetCheckoutState } from '../store/checkoutSlice';
import Spinner from '../components/Spinner';
import { PAPER_FINISHES, PAPER_WEIGHTS, FRAME_COLORS } from '../store/productSlice';
import { CartItem } from '../store/cartSlice';
import { LAYOUT_TEMPLATES } from '../store/layoutSlice';
import { MAP_STYLE_OPTIONS } from '../store/mapSlice';

// Add style override for checkout item titles
const checkoutStyles = `
  .force-align-left p,
  .force-align-left div,
  .force-align-left span {
    text-align: left !important;
  }
`;

// Fonction simple pour supprimer les balises HTML (avec type)
const stripHtml = (html: string | null | undefined): string => {
   if (!html) return '';
   // Crée un élément temporaire, y insère le HTML, puis récupère le texte brut
   try {
       const doc = new DOMParser().parseFromString(html, 'text/html');
       return doc.body.textContent || "";
   } catch (e) {
       console.error("Erreur lors du nettoyage HTML:", e);
       // Fallback vers une regex simple si DOMParser échoue
       return html.replace(/<[^>]*>/g, ''); 
   }
}

const Checkout = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const { isProcessing, error } = useSelector((state: RootState) => state.checkout);
  const cartItems = useSelector((state: RootState) => state.cart.items);

  useEffect(() => {
      dispatch(resetCheckoutState());
  }, [dispatch]);

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + item.posterConfiguration.product.price, 0);
  };

   const formatPrice = (price: number) => {
    return price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  };

  const getItemDetails = (config: CartItem['posterConfiguration']) => {
    const details = [];
    details.push('Format : A3');
    const finish = PAPER_FINISHES.find(f => f.id === config.product.selectedPaperFinishId)?.name;
    if (finish) details.push(`Finition : ${finish}`);
    const weight = PAPER_WEIGHTS.find(w => w.id === config.product.selectedPaperWeightId)?.name;
    if (weight) details.push(`Grammage : ${weight}`);
    const frame = FRAME_COLORS.find(f => f.id === config.product.selectedFrameColorId)?.name;
    if (config.product.productType === 'Framed poster' && frame) {
        details.push(`Cadre : ${frame}`);
    }
    const layoutName = LAYOUT_TEMPLATES.find(l => l.id === config.layout.selectedLayoutId)?.name;
    if (layoutName) details.push(`Mise en page : ${layoutName}`);
    const mapStyleName = MAP_STYLE_OPTIONS.find(m => m.id === config.map.selectedStyleId)?.name;
    if (mapStyleName) details.push(`Style carte : ${mapStyleName}`);
    return details.join(' · ');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    dispatch(startPaymentProcessing());

    const lineItems = cartItems.map((item, index) => {
      const plainTextTitle = stripHtml(item.posterConfiguration.labels.title.text || 'Affiche personnalisée');
      // Créer le nom préfixé et le mettre en majuscules
      const prefixedTitle = `Poster ${index + 1}: ${plainTextTitle}`.toUpperCase();

      return {
          price_data: {
            currency: 'eur',
            product_data: {
              name: prefixedTitle, // Utiliser le titre préfixé et en majuscules
              metadata: { cartItemId: item.id }
            },
            unit_amount: Math.round(item.posterConfiguration.product.price * 100),
          },
          quantity: 1,
        };
    });

    try {
      console.log("Calling backend to create Stripe Checkout Session...");
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ line_items: lineItems }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to create checkout session (${response.status} ${response.statusText})`;
        try {
            const errorData = await response.json();
            errorMessage = errorData?.error?.message || errorData?.message || errorMessage;
        } catch (e) {
            console.warn("Could not parse error response as JSON.");
        }
        throw new Error(errorMessage);
      }

      const successData = await response.json();
      const { url } = successData;
      console.log("Received Stripe Checkout Session URL:", url);

      if (!url) {
           throw new Error('Missing session URL from server response.');
      }

      window.location.href = url;

    } catch (err: any) {
       console.error("Checkout session creation error:", err);
       dispatch(paymentFailure(err.message || "An unexpected error occurred."));
    }
  };

  if (cartItems.length === 0 && !isProcessing) {
       return (
            <div className="text-center py-10 text-gray-500">
                Votre panier est vide. Impossible de procéder au paiement.
                <button onClick={() => navigate('/')} className="mt-4 block mx-auto text-blue-500 hover:text-blue-400">Retour à l'éditeur</button>
            </div>
       )
  }

  return (
    <div className="space-y-6 p-4 md:p-6 text-white max-w-2xl mx-auto">
      {/* Header */}
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-semibold font-sans">Paiement</h1>
        <p className="text-gray-400 font-light text-sm">
          Merci de vérifier votre commande avant de procéder au paiement.
        </p>
      </div>

      {/* Liste des articles */}
      <div className="space-y-4">
        {cartItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 bg-neutral-800 rounded-md p-4 shadow"
          >
            <img
              src={item.thumbnailUrl || ''}
              alt="Aperçu de l'affiche"
              className="w-20 h-28 rounded shadow object-cover bg-gray-700"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-lg text-white truncate">
                <span dangerouslySetInnerHTML={{ __html: item.posterConfiguration.labels.title.text || 'Affiche personnalisée' }} />
              </div>
              <div className="text-sm text-gray-400 italic mt-1 line-clamp-3">
                {getItemDetails(item.posterConfiguration)}
              </div>
            </div>
            <div className="font-semibold text-orange-400 text-lg ml-4 whitespace-nowrap">
              {formatPrice(item.posterConfiguration.product.price)}
            </div>
          </div>
        ))}
      </div>

      {/* Résumé et bouton paiement */}
      <div className="pt-8 mt-8 border-t border-gray-600 space-y-5">
        <div className="flex justify-between items-center text-base font-semibold font-sans">
          <span>Total :</span>
          <span>{formatPrice(getTotalPrice())}</span>
        </div>
        <form onSubmit={handleSubmit}>
          <button
            type="submit"
            className="w-full bg-orange-500 hover:opacity-85 text-white py-3 rounded-sm text-xs font-sans font-medium transition duration-150 uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-2"
            disabled={isProcessing}
          >
            {isProcessing ? <><Spinner /> <span>Paiement en cours...</span></> : 'Payer maintenant'}
          </button>
        </form>
        {error && (
          <div className="text-red-500 text-sm mt-2">Erreur lors du paiement : {error}</div>
        )}
      </div>
    </div>
  );
};

export default Checkout;