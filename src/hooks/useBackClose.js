import { useEffect, useRef } from 'react';

/**
 * Hook to handle closing modals/overlays with the system back button.
 * Uses URL Hash (#modal) to ensure robust history tracking in WebViews.
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to call to close the modal
 */
export const useBackClose = (isOpen, onClose) => {
  const isClosingRef = useRef(false);
  const hashRef = useRef(`modal-${Math.random().toString(36).substr(2, 9)}`); // Unique hash for this modal instance
  const onCloseRef = useRef(onClose);

  // Keep onCloseRef updated
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      isClosingRef.current = false;
      
      // Push hash state
      // We use a unique hash to ensure we can identify *this* modal's state
      const newHash = `#${hashRef.current}`;
      
      // Check if we are already at this hash (re-renders)
      if (window.location.hash !== newHash) {
          window.history.pushState({ modalOpen: true, id: hashRef.current }, '', newHash);
      }

      const handlePopState = () => {
        // If the hash matches, we are still "open" (forward navigation?), 
        // but typically popstate means we went BACK or FORWARD.
        // If the current hash DOES NOT match our hash anymore, it means we navigated away (Back).
        if (window.location.hash !== newHash) {
            isClosingRef.current = true;
            if (onCloseRef.current) {
                onCloseRef.current();
            }
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        
        // Cleanup: If closing programmatically (not via Back button), we must go back manually
        // to remove the hash we added.
        if (!isClosingRef.current && window.location.hash === newHash) {
           window.history.back();
        }
      };
    }
  }, [isOpen]); // Removed onClose from dependency array

  // Compatibility return for existing usage
  return { onNavigate: () => {} }; 
};
