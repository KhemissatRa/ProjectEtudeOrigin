import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { removeFromCart } from '../store/cartSlice';
import { HiTrash, HiMinus, HiPlus, HiOutlineShoppingBag } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import { PAPER_FINISHES, PAPER_WEIGHTS, FRAME_COLORS } from '../store/productSlice';
import { LAYOUT_TEMPLATES } from '../store/layoutSlice';
import { MAP_STYLE_OPTIONS } from '../store/mapSlice';
import { CartItem } from '../store/cartSlice';

const Cart = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const isOverlayVisible = useSelector((state: RootState) => state.overlay.isVisible);

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + item.posterConfiguration.product.price, 0);
  };

   const formatPrice = (price: number) => {
    return price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  };

  const getItemDetails = (config: CartItem['posterConfiguration']) => {
    // Afficher toujours A3, pas de choix de taille
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
  }

  return (
    <div className="space-y-6 p-4 md:p-6 text-white max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-semibold font-sans">Panier</h1>
        <p className="text-gray-400 font-light text-sm">
          Vérifiez vos articles avant de finaliser la commande.
        </p>
      </div>

      {cartItems.length === 0 ? (
         <div className="text-center py-16 text-gray-400 bg-[#2a2a2a] rounded-md">
            <HiOutlineShoppingBag className="w-20 h-20 mx-auto mb-6 text-gray-500" />
            <p className="font-sans text-lg mb-4">Votre panier est vide.</p>
            <button
              onClick={() => navigate('/')} 
              className="px-6 py-2.5 bg-[#333333] hover:bg-[#444444] text-white text-sm font-medium rounded-sm transition-colors duration-150 uppercase tracking-wider cursor-pointer"
            >
              Commencer la création
            </button>
         </div>
      ) : (
        <div className="space-y-5">
          {cartItems.map((item) => (
            <React.Fragment key={item.id}>
              {/* Card Container - Vertical Layout */}
              <div className="flex flex-col bg-[#333333] rounded-sm shadow-lg overflow-hidden border border-gray-700">
                {/* Image Area - Full Width at Top */}
                <div
                  className="w-full rounded-t-sm flex items-center justify-center py-5"
                  style={{
                    aspectRatio: "0.707", // Largeur/Hauteur pour A3
                    minHeight: 120,      // Plus compact
                    maxHeight: 260,      // Hauteur réduite, pro
                    background: "#222"
                  }}
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt="Aperçu de l'affiche"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-center">Aperçu indisponible</span>
                  )}
                </div>

                {/* Content Area - Below Image */}
                <div className="p-4 flex flex-col flex-grow">
                  {/* Title - MODIFIED */}
                  <div 
                    className="font-semibold font-sans text-lg mb-1 truncate cart-item-title"
                    dangerouslySetInnerHTML={{ __html: item.posterConfiguration.labels.title.text || 'Affiche personnalisée' }}
                  />

                  {/* Details Section - Already using dangerouslySetInnerHTML */}
                  <div
                    className="text-xs text-gray-400 font-light leading-snug mb-3 cart-item-details"
                    dangerouslySetInnerHTML={{ __html: getItemDetails(item.posterConfiguration) }}
                  />

                  {/* Bottom Section: Price & Remove */}
                  <div className="mt-auto pt-2 flex items-center justify-between">
                     {/* Price */}
                     <p className="text-base font-semibold font-sans">{formatPrice(item.posterConfiguration.product.price)}</p>

                     {/* Remove Button Only */} 
                     <button
                       onClick={() => dispatch(removeFromCart(item.id))}
                       className="text-gray-500 hover:text-red-500 transition-colors p-1 cursor-pointer"
                       aria-label="Supprimer l'article"
                     >
                       <HiTrash className="w-5 h-5" />
                     </button>
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}

          {/* Cart Summary & Checkout Button */}
          <div className="pt-8 mt-8 border-t border-gray-600 space-y-5">
             <div className="flex justify-between items-center text-base font-semibold font-sans">
                <span>Total :</span>
                <span>{formatPrice(getTotalPrice())}</span>
             </div>
              <button
                onClick={() => navigate('/checkout')}
                className="w-full bg-orange-500 hover:opacity-85 text-white py-3 rounded-sm text-xs font-sans font-medium transition duration-150 uppercase tracking-wider shadow-md cursor-pointer"
            >
                Finaliser la commande
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;