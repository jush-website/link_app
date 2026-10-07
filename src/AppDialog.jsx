import { useId, useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function AppDialog({ title, onClose, children }) {
  const dialog = useRef(null);
  const titleId = useId();
  useLayoutEffect(() => {
    const element = dialog.current;
    const invoker = document.activeElement;
    element.showModal();
    return () => { element.close(); if (invoker?.isConnected) invoker.focus(); };
  }, []);

  return <dialog ref={dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-5 text-slate-800 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm">
    <header className="mb-3 flex items-center justify-between gap-3"><h2 id={titleId} className="min-w-0 break-words font-bold">{title}</h2><button type="button" aria-label="關閉視窗" onClick={onClose} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50"><X size={20} /></button></header>
    {children}
  </dialog>;
}
