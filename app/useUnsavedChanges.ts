'use client';
import { useCallback, useEffect, useRef } from 'react';

export function useUnsavedChanges() {
  const dirty = useRef(false);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('beforeunload', warn); window.dispatchEvent(new CustomEvent('thinkup:unsaved',{detail:false})); };
  }, []);
  return {
    markChanged: useCallback(() => { dirty.current = true; window.dispatchEvent(new CustomEvent('thinkup:unsaved',{detail:true})); }, []),
    markSaved: useCallback(() => { dirty.current = false; window.dispatchEvent(new CustomEvent('thinkup:unsaved',{detail:false})); }, []),
  };
}
