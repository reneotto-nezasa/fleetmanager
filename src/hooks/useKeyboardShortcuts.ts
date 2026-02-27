import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Global keyboard shortcuts for the app.
 *
 * - Cmd+N (or Ctrl+N): Dispatches a custom "open-create-sheet" event.
 *   Page components (BusesPage, BoardingPointsPage) listen for this
 *   event and open their respective create sheets.
 *
 * - Cmd+K is handled separately by CommandPalette via useCommandPalette.
 * - Escape is handled natively by Radix dialogs/sheets.
 * - Arrow keys for the seat map editor are handled in useSeatMapEditor.
 */
export function useKeyboardShortcuts() {
  const location = useLocation();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+N / Ctrl+N — create new entity
      if (e.key === 'n' && (e.metaKey || e.ctrlKey)) {
        // Don't intercept if the user is typing in an input/textarea
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }

        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent('open-create-sheet', {
            detail: { pathname: location.pathname },
          })
        );
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname]);
}
