import { useEffect, useRef } from 'react';

/**
 * Hook to handle closing modals/overlays with the system back button.
 * Pushes a state to history when opened, and listens for popstate to close.
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to call to close the modal
 * @returns {object} - { onNavigate } function to call before navigating away to prevent double-back
 */
export const useBackClose = (isOpen, onClose) => {
  const isClosingRef = useRef(false);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      // Reset refs
      isNavigatingRef.current = false;
      isClosingRef.current = false;
      
      // Push state to trap back button
      // We use a unique object so we could potentially identify it, though simple check is usually enough
      const state = { modalOpen: true, timestamp: Date.now() };
      window.history.pushState(state, '');

      const handlePopState = (event) => {
        // User pressed hardware back button
        // The history is already popped by the browser
        isClosingRef.current = true;
        onClose();
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        
        // Cleanup logic:
        // If closing manually (not by back button) and not navigating away,
        // we must manually pop the history state we pushed.
        if (!isClosingRef.current && !isNavigatingRef.current) {
           window.history.back();
        }
      };
    }
  }, [isOpen, onClose]);

  const onNavigate = () => {
    isNavigatingRef.current = true;
  };

  return { onNavigate };
};
