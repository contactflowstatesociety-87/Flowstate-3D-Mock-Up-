import { useState, useCallback } from 'react';

/**
 * A custom hook to manage state with an undo/redo history.
 * This version is architected to provide stable setter functions, preventing
 * unintended side effects in components that depend on them.
 * @param initialState The initial state value.
 */
function useHistoryState<T>(initialState: T) {
  // Combine history and index into a single state object to ensure atomic updates.
  const [state, _setState] = useState({
    history: [initialState],
    index: 0,
  });
  const { history, index } = state;

  /**
   * Updates the state and history.
   * This callback is memoized with an empty dependency array, making it stable.
   * It uses a functional update on the internal state setter to avoid stale closures.
   */
  const setState = useCallback((newState: T | ((prevState: T) => T), overwriteHistory = false) => {
    _setState(currentState => {
      const { history: currentHistory, index: currentIndex } = currentState;

      const resolvedState = typeof newState === 'function'
        ? (newState as (prevState: T) => T)(currentHistory[currentIndex])
        : newState;

      // Prevent adding a new history entry if the state hasn't changed.
      if (JSON.stringify(resolvedState) === JSON.stringify(currentHistory[currentIndex])) {
        return currentState;
      }

      // If we are not at the most recent state, slice off the future states.
      const historyToConsider = overwriteHistory ? [] : currentHistory.slice(0, currentIndex + 1);
      const newHistory = [...historyToConsider, resolvedState];
      
      return {
        history: newHistory,
        index: newHistory.length - 1,
      };
    });
  }, []);

  /**
   * Moves the state to the previous entry in the history.
   * Stable callback with no dependencies.
   */
  const undo = useCallback(() => {
    _setState(currentState => {
      if (currentState.index > 0) {
        return { ...currentState, index: currentState.index - 1 };
      }
      return currentState;
    });
  }, []);

  /**
   * Moves the state to the next entry in the history.
   * Stable callback with no dependencies.
   */
  const redo = useCallback(() => {
    _setState(currentState => {
      if (currentState.index < currentState.history.length - 1) {
        return { ...currentState, index: currentState.index + 1 };
      }
      return currentState;
    });
  }, []);

  return {
    state: history[index],
    setState,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
  };
}

export default useHistoryState;