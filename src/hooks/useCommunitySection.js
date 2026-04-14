import { useCallback } from 'react';

/**
 * Shared handlers for community post-list sections (Help, Team).
 * Eliminates duplicate handlePostClick / handlePageChange / handleComposerSuccess
 * across CommunityHelp and CommunityTeam.
 */
export function useCommunitySection({ setSelectedItem, setCurrentPage, refresh }) {
  const handleItemClick = useCallback(
    (item) => setSelectedItem(item),
    [setSelectedItem],
  );

  const handlePageChange = useCallback(
    (page) => {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setCurrentPage],
  );

  const handleComposerSuccess = useCallback(
    () => refresh({ clearCache: true }),
    [refresh],
  );

  return { handleItemClick, handlePageChange, handleComposerSuccess };
}
