'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

type ContentType =
  | 'pet-detail'
  | 'pet-edit'
  | 'consultation-detail'
  | 'consultation-edit'
  | 'consultation-chat'
  | 'care-plan-detail';

interface DetailPanelState {
  isOpen: boolean;
  contentType: ContentType | null;
  entityId: string | null;
  panelSize: 'default' | 'maximized';
}

const initialState: DetailPanelState = {
  isOpen: false,
  contentType: null,
  entityId: null,
  panelSize: 'default',
};

export function useDetailPanel() {
  const [state, setState] = useState<DetailPanelState>(initialState);
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  // Auto-close panel when navigating to a different route
  // (e.g., clicking "Join Call" inside the panel)
  // Uses ref to only close on actual pathname changes, not initial mount
  useEffect(() => {
    if (prevPathname.current !== pathname && state.isOpen) {
      close();
    }
    prevPathname.current = pathname;
    // Only react to pathname changes — intentionally omit state from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const openPetDetail = useCallback((id: string) => {
    setState({
      isOpen: true,
      contentType: 'pet-detail',
      entityId: id,
      panelSize: 'default',
    });
  }, []);

  const openConsultationDetail = useCallback((id: string) => {
    setState({
      isOpen: true,
      contentType: 'consultation-detail',
      entityId: id,
      panelSize: 'default',
    });
  }, []);

  const openCarePlanDetail = useCallback((id: string) => {
    setState({
      isOpen: true,
      contentType: 'care-plan-detail',
      entityId: id,
      panelSize: 'default',
    });
  }, []);

  const switchToEdit = useCallback(() => {
    setState((prev) => {
      if (!prev.isOpen || !prev.entityId) return prev;
      const editType: ContentType =
        prev.contentType === 'pet-detail' || prev.contentType === 'pet-edit'
          ? 'pet-edit'
          : 'consultation-edit';
      return { ...prev, contentType: editType };
    });
  }, []);

  const switchToDetail = useCallback(() => {
    setState((prev) => {
      if (!prev.isOpen || !prev.entityId) return prev;
      // Handle chat → detail transition
      if (
        prev.contentType === 'consultation-chat' ||
        prev.contentType === 'consultation-detail' ||
        prev.contentType === 'consultation-edit'
      ) {
        return { ...prev, contentType: 'consultation-detail' };
      }
      if (prev.contentType === 'pet-detail' || prev.contentType === 'pet-edit') {
        return { ...prev, contentType: 'pet-detail' };
      }
      return prev;
    });
  }, []);

  const switchToChat = useCallback(() => {
    setState((prev) => {
      if (!prev.isOpen || !prev.entityId) return prev;
      return { ...prev, contentType: 'consultation-chat' };
    });
  }, []);

  const toggleSize = useCallback(() => {
    setState((prev) => ({
      ...prev,
      panelSize: prev.panelSize === 'default' ? 'maximized' : 'default',
    }));
  }, []);

  const close = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    openPetDetail,
    openConsultationDetail,
    openCarePlanDetail,
    switchToEdit,
    switchToDetail,
    switchToChat,
    toggleSize,
    close,
  };
}
