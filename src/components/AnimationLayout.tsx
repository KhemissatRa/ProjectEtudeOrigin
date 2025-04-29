import { motion } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';

const AnimationLayout = () => {
  const { pathname } = useLocation();

  // Définir les variantes d'animation pour un effet de fondu
  const pageVariants = {
    initial: {
      opacity: 0,
    },
    in: {
      opacity: 1,
    },
    out: {
      opacity: 0,
    },
  };

  // Définir la transition pour l'animation
  const pageTransition = {
    type: 'tween',
    ease: 'easeInOut',
    duration: 0.3, // Durée de l'animation en secondes
  };

  return (
    <>
      <motion.div
        key={pathname}
        initial="initial"
        animate="in"
        exit="out" // Pour une animation de sortie (facultatif)
        variants={pageVariants}
        transition={pageTransition}
        style={{ position: 'relative' }} // Important pour les animations de sortie
      >
        <Outlet />
      </motion.div>
    </>
  );
};

export default AnimationLayout;