'use client';

import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

const variants = {
  hidden: {
    opacity: 0,
    visibility: 'hidden',
  },
  visible: {
    opacity: 1,
    visibility: 'visible',
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    visibility: 'hidden',
    transition: {
      duration: 0.25,
      ease: [0.55, 0.055, 0.675, 0.19],
    },
  },
};

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <MotionConfig transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants}
          className="w-full"
          suppressHydrationWarning
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
