import { useEffect, useId, useRef } from 'react';

/**
 * Hook to handle closing modals/overlays with the system back button.
 * Uses URL Hash (#modal) to ensure robust history tracking in WebViews.
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to call to close the modal
 */
export const useBackClose = (isOpen, onClose) => {
  const id = useId();
  const isClosingRef = useRef(false);
  const hashRef = useRef(null);
  const onCloseRef = useRef(onClose);

  if (hashRef.current == null) {
    hashRef.current = `modal-${id.replaceAll(':', '')}`;
  }

  // Keep onCloseRef updated
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const newHash = `#${hashRef.current}`;
    const cleanupRef = { current: null };

    // Defer side effects by a macrotask so React.StrictMode's dev-time
    // unmount/remount cycle cancels out: if the first mount is cancelled
    // before the timer fires, we never push history at all. Without this,
    // the strict-mode cleanup's history.back() fires the second mount's
    // popstate listener and prematurely closes the modal.
    let timer = setTimeout(() => {
      timer = null;
      isClosingRef.current = false;

      if (window.location.hash !== newHash) {
        window.history.pushState({ modalOpen: true, id: hashRef.current }, '', newHash);
      }

      const handlePopState = () => {
        if (window.location.hash !== newHash) {
          isClosingRef.current = true;
          if (onCloseRef.current) onCloseRef.current();
        }
      };
      window.addEventListener('popstate', handlePopState);
      cleanupRef.current = () => {
        window.removeEventListener('popstate', handlePopState);
        if (!isClosingRef.current && window.location.hash === newHash) {
          window.history.back();
        }
      };
    }, 0);

    return () => {
      if (timer !== null) {
        clearTimeout(timer);
        return;
      }
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [isOpen]); // Removed onClose from dependency array

  // Compatibility return for existing usage
  return { onNavigate: () => {} }; 
};
