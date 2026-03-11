'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';

type ContentType =
  | 'pet-detail'
  | 'pet-edit'
  | 'consultation-detail'
  | 'consultation-edit';

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

  // Auto-close panel when navigating to a different route
  // (e.g., clicking "Join Call" or "Follow-up Chat" inside the panel)
  useEffect(() => {
    if (state.isOpen) {
      close();
    }
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
      const detailType: ContentType =
        prev.contentType === 'pet-detail' || prev.contentType === 'pet-edit'
          ? 'pet-detail'
          : 'consultation-detail';
      return { ...prev, contentType: detailType };
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
    switchToEdit,
    switchToDetail,
    toggleSize,
    close,
  };
}
