'use client';
import { useCallback, useEffect, useRef } from 'react';

const pendingEditors=new Set<object>();
function publish(){window.dispatchEvent(new CustomEvent('thinkup:unsaved',{detail:pendingEditors.size>0}))}

export function useUnsavedChanges() {
  const dirty = useRef(false);
  const identity = useRef({});
  useEffect(() => {
    const editor=identity.current;
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('beforeunload', warn);pendingEditors.delete(editor);publish(); };
  }, []);
  return {
    markChanged: useCallback(() => { dirty.current = true;pendingEditors.add(identity.current);publish(); }, []),
    markSaved: useCallback(() => { dirty.current = false;pendingEditors.delete(identity.current);publish(); }, []),
  };
}
