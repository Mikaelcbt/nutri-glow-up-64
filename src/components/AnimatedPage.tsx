import { motion, type Variants, type Easing } from 'framer-motion';
import { ReactNode } from 'react';

const easeOut: Easing = [0, 0, 0.2, 1];

const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
};

export function AnimatedPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: easeOut }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const staggerContainer: Variants = {
  animate: {
    transition: { staggerChildren: 0.1 },
  },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
};

export const fadeInRight: Variants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.5, ease: easeOut } },
};

export const fadeInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: easeOut } },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: easeOut } },
};
