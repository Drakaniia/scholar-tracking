'use client';

import { ReactNode } from 'react';

import { usePathname } from 'next/navigation';

import { AnimatePresence, motion } from 'motion/react';

interface PageTransitionProps {
  children: ReactNode;
}

// Optimized variants with faster duration for snappier feel
const variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2, // Reduced from 0.4 for snappier transitions
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.1, // Reduced from 0.15 for faster exit
      ease: [0.22, 1, 0.36, 1],
    },
  },
} as const;

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={variants}
        className="w-full relative"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
