import { useMemo } from 'react';
import { useAppStore } from '@/shared/store/appStore';

export const useAnimations = () => {
  const { performance } = useAppStore();
  const { enableAnimations, reduceMotion } = performance;

  return useMemo(() => {
    const shouldAnimate = enableAnimations && !reduceMotion;
    
    // Motion variants for common animations
    const variants = {
      // Fade in/out animations
      fadeIn: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: {
          duration: shouldAnimate ? 0.2 : 0,
          ease: 'easeOut'
        }
      },

      // Scale animations for buttons and interactions
      scaleIn: {
        initial: { scale: 0.95, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0.95, opacity: 0 },
        transition: {
          duration: shouldAnimate ? 0.15 : 0,
          ease: 'easeOut'
        }
      },

      // Slide animations for components
      slideUp: {
        initial: { y: 20, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: -20, opacity: 0 },
        transition: {
          duration: shouldAnimate ? 0.3 : 0,
          ease: 'easeOut'
        }
      },

      // Rotation for swap button
      rotate: {
        animate: { rotate: 180 },
        transition: {
          duration: shouldAnimate ? 0.3 : 0,
          ease: 'easeInOut'
        }
      },

      // Pulse animation for loading states
      pulse: {
        animate: {
          scale: [1, 1.05, 1],
          opacity: [1, 0.8, 1]
        },
        transition: {
          duration: shouldAnimate ? 1.5 : 0,
          repeat: Infinity,
          ease: 'easeInOut'
        }
      },

      // Shake animation for errors
      shake: {
        animate: {
          x: [0, -10, 10, -10, 10, 0],
        },
        transition: {
          duration: shouldAnimate ? 0.5 : 0,
          ease: 'easeInOut'
        }
      },

      // Height animation for expandable content
      expand: {
        initial: { height: 0, opacity: 0 },
        animate: { height: 'auto', opacity: 1 },
        exit: { height: 0, opacity: 0 },
        transition: {
          height: { duration: shouldAnimate ? 0.3 : 0, ease: 'easeOut' },
          opacity: { duration: shouldAnimate ? 0.2 : 0, delay: shouldAnimate ? 0.1 : 0 }
        }
      },

      // Number counter animation
      counter: {
        animate: { opacity: [0.5, 1] },
        transition: {
          duration: shouldAnimate ? 0.2 : 0,
          ease: 'easeOut'
        }
      }
    };

    // Tailwind transition classes
    const transitions = {
      default: shouldAnimate ? 'transition-all duration-200 ease-out' : '',
      fast: shouldAnimate ? 'transition-all duration-150 ease-out' : '',
      medium: shouldAnimate ? 'transition-all duration-300 ease-out' : '',
      slow: shouldAnimate ? 'transition-all duration-500 ease-out' : '',
      colors: shouldAnimate ? 'transition-colors duration-200 ease-out' : '',
      transform: shouldAnimate ? 'transition-transform duration-200 ease-out' : '',
      opacity: shouldAnimate ? 'transition-opacity duration-200 ease-out' : '',
    };

    // Hover effects
    const hover = {
      scale: shouldAnimate ? 'hover:scale-105' : '',
      lift: shouldAnimate ? 'hover:-translate-y-1' : '',
      glow: shouldAnimate ? 'hover:shadow-lg' : '',
    };

    // Focus effects
    const focus = {
      scale: shouldAnimate ? 'focus:scale-102' : '',
      ring: shouldAnimate ? 'focus:ring-2 focus:ring-primary/20' : '',
    };

    return {
      shouldAnimate,
      variants,
      transitions,
      hover,
      focus,
    };
  }, [enableAnimations, reduceMotion]);
};