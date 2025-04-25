import { useState, useCallback } from "react";

interface ModalState {
  isOpen: boolean;
  content?: string;
}

export function useModal(initialState = false) {
  const [state, setState] = useState<ModalState>({ isOpen: initialState });

  const open = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true }));
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  const openAssistantModal = useCallback((initialContent?: string) => {
    setState({ isOpen: true, content: initialContent });
  }, []);

  return {
    isOpen: state.isOpen,
    content: state.content,
    open,
    close,
    toggle,
    openAssistantModal,
  };
}
