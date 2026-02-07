'use client';

import { useState, useCallback } from 'react';
import type { Consultation, ConsultationStatus } from '@/types';
import type { ConsultationWithRelations } from '@/lib/utils/consultationMapper';

interface ConsultationFilter {
  status?: ConsultationStatus | ConsultationStatus[];
  type?: Consultation['type'];
  limit?: number;
}

interface UseConsultationsState {
  consultations: ConsultationWithRelations[];
  loading: boolean;
  error: string | null;
}

interface CreateConsultationData {
  petId: string;
  concernText?: string;
  symptomCategories?: string[];
}

interface UseConsultationsReturn extends UseConsultationsState {
  fetchConsultations: (filter?: ConsultationFilter) => Promise<void>;
  getConsultation: (id: string) => Promise<{ consultation?: ConsultationWithRelations; error?: string }>;
  createConsultation: (data: CreateConsultationData) => Promise<{ consultation?: Consultation; error?: string }>;
  cancelConsultation: (id: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

export function useConsultations(): UseConsultationsReturn {
  const [state, setState] = useState<UseConsultationsState>({
    consultations: [],
    loading: false,
    error: null,
  });

  const fetchConsultations = useCallback(async (filter?: ConsultationFilter) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const params = new URLSearchParams();
      if (filter?.status) {
        if (Array.isArray(filter.status)) {
          params.set('status', filter.status.join(','));
        } else {
          params.set('status', filter.status);
        }
      }
      if (filter?.type) {
        params.set('type', filter.type);
      }
      if (filter?.limit) {
        params.set('limit', String(filter.limit));
      }

      const url = `/api/consultations${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch consultations');
      }

      setState({
        consultations: data.consultations,
        loading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch consultations';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
    }
  }, []);

  const getConsultation = useCallback(
    async (id: string): Promise<{ consultation?: ConsultationWithRelations; error?: string }> => {
      try {
        const response = await fetch(`/api/consultations/${id}`);
        const data = await response.json();

        if (!response.ok) {
          return { error: data.error || 'Failed to fetch consultation' };
        }

        return { consultation: data.consultation };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch consultation';
        return { error: message };
      }
    },
    []
  );

  const createConsultation = useCallback(
    async (consultationData: CreateConsultationData): Promise<{ consultation?: Consultation; error?: string }> => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const response = await fetch('/api/consultations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(consultationData),
        });

        const data = await response.json();

        if (!response.ok) {
          setState((prev) => ({ ...prev, loading: false, error: data.error }));
          return { error: data.error || 'Failed to create consultation' };
        }

        // Add new consultation to state
        setState((prev) => ({
          consultations: [data.consultation, ...prev.consultations],
          loading: false,
          error: null,
        }));

        return { consultation: data.consultation };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create consultation';
        setState((prev) => ({ ...prev, loading: false, error: message }));
        return { error: message };
      }
    },
    []
  );

  const cancelConsultation = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const response = await fetch(`/api/consultations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' }),
        });

        const data = await response.json();

        if (!response.ok) {
          setState((prev) => ({ ...prev, loading: false, error: data.error }));
          return { success: false, error: data.error || 'Failed to cancel consultation' };
        }

        // Update consultation in state
        setState((prev) => ({
          consultations: prev.consultations.map((c) =>
            c.id === id ? { ...c, status: 'cancelled' as ConsultationStatus } : c
          ),
          loading: false,
          error: null,
        }));

        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to cancel consultation';
        setState((prev) => ({ ...prev, loading: false, error: message }));
        return { success: false, error: message };
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    fetchConsultations,
    getConsultation,
    createConsultation,
    cancelConsultation,
    clearError,
  };
}
