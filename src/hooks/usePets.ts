'use client';

import { useState, useCallback } from 'react';
import type { Pet } from '@/types';

interface UsePetsState {
  pets: Pet[];
  loading: boolean;
  error: string | null;
}

interface UsePetsReturn extends UsePetsState {
  fetchPets: () => Promise<void>;
  createPet: (data: Partial<Pet>) => Promise<{ pet?: Pet; error?: string }>;
  updatePet: (id: string, data: Partial<Pet>) => Promise<{ pet?: Pet; error?: string }>;
  deletePet: (id: string) => Promise<{ success: boolean; error?: string }>;
  getPet: (id: string) => Promise<{ pet?: Pet; error?: string }>;
  clearError: () => void;
}

export function usePets(): UsePetsReturn {
  const [state, setState] = useState<UsePetsState>({
    pets: [],
    loading: false,
    error: null,
  });

  const fetchPets = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const response = await fetch('/api/pets');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pets');
      }

      setState({
        pets: data.pets,
        loading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch pets';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
    }
  }, []);

  const getPet = useCallback(async (id: string): Promise<{ pet?: Pet; error?: string }> => {
    try {
      const response = await fetch(`/api/pets/${id}`);
      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Failed to fetch pet' };
      }

      return { pet: data.pet };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch pet';
      return { error: message };
    }
  }, []);

  const createPet = useCallback(async (petData: Partial<Pet>): Promise<{ pet?: Pet; error?: string }> => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const response = await fetch('/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(petData),
      });

      const data = await response.json();

      if (!response.ok) {
        setState((prev) => ({ ...prev, loading: false, error: data.error }));
        return { error: data.error || 'Failed to create pet' };
      }

      // Add new pet to state
      setState((prev) => ({
        pets: [data.pet, ...prev.pets],
        loading: false,
        error: null,
      }));

      return { pet: data.pet };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create pet';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      return { error: message };
    }
  }, []);

  const updatePet = useCallback(async (id: string, petData: Partial<Pet>): Promise<{ pet?: Pet; error?: string }> => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const response = await fetch(`/api/pets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(petData),
      });

      const data = await response.json();

      if (!response.ok) {
        setState((prev) => ({ ...prev, loading: false, error: data.error }));
        return { error: data.error || 'Failed to update pet' };
      }

      // Update pet in state
      setState((prev) => ({
        pets: prev.pets.map((pet) => (pet.id === id ? data.pet : pet)),
        loading: false,
        error: null,
      }));

      return { pet: data.pet };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update pet';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      return { error: message };
    }
  }, []);

  const deletePet = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const response = await fetch(`/api/pets/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        setState((prev) => ({ ...prev, loading: false, error: data.error }));
        return { success: false, error: data.error || 'Failed to delete pet' };
      }

      // Remove pet from state
      setState((prev) => ({
        pets: prev.pets.filter((pet) => pet.id !== id),
        loading: false,
        error: null,
      }));

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete pet';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      return { success: false, error: message };
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    fetchPets,
    getPet,
    createPet,
    updatePet,
    deletePet,
    clearError,
  };
}
