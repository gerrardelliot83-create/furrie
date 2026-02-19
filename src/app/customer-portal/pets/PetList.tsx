'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { Pet } from '@/types';
import { usePets } from '@/hooks/usePets';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { PetCard } from '@/components/customer/PetCard';
import styles from './PetList.module.css';

interface PetListProps {
  initialPets: Pet[];
}

export function PetList({ initialPets }: PetListProps) {
  const t = useTranslations('common');
  const { deletePet, loading } = usePets();
  const { success, error: showError } = useToast();

  const [pets, setPets] = useState<Pet[]>(initialPets);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [petToDelete, setPetToDelete] = useState<Pet | null>(null);
  const [consultationCount, setConsultationCount] = useState<number>(0);

  const handleDeleteClick = useCallback(async (id: string) => {
    const pet = pets.find((p) => p.id === id);
    if (pet) {
      setPetToDelete(pet);
      // Check how many consultations reference this pet
      try {
        const response = await fetch(`/api/pets/${id}/consultation-count`);
        if (response.ok) {
          const data = await response.json();
          setConsultationCount(data.count || 0);
        } else {
          setConsultationCount(0);
        }
      } catch {
        setConsultationCount(0);
      }
      setDeleteModalOpen(true);
    }
  }, [pets]);

  const handleConfirmDelete = useCallback(async () => {
    if (!petToDelete) return;

    const { success: deleted, error } = await deletePet(petToDelete.id);

    if (error) {
      showError(error);
    } else if (deleted) {
      success(`${petToDelete.name} has been removed`);
      setPets((prev) => prev.filter((p) => p.id !== petToDelete.id));
    }

    setDeleteModalOpen(false);
    setPetToDelete(null);
  }, [petToDelete, deletePet, success, showError]);

  const handleCancelDelete = useCallback(() => {
    setDeleteModalOpen(false);
    setPetToDelete(null);
  }, []);

  return (
    <>
      <div className={styles.grid}>
        {pets.map((pet) => (
          <PetCard
            key={pet.id}
            pet={pet}
            onDelete={handleDeleteClick}
          />
        ))}
      </div>

      <Modal
        isOpen={deleteModalOpen}
        onClose={handleCancelDelete}
        title="Delete Pet"
        size="sm"
      >
        <div className={styles.deleteModal}>
          <p className={styles.deleteMessage}>
            Are you sure you want to delete <strong>{petToDelete?.name}</strong>?
            This action cannot be undone.
          </p>
          {consultationCount > 0 && (
            <p className={styles.deleteWarning}>
              This pet has {consultationCount} consultation{consultationCount !== 1 ? 's' : ''}. Deleting will not remove consultation history.
            </p>
          )}
          <div className={styles.deleteActions}>
            <Button
              variant="ghost"
              onClick={handleCancelDelete}
              disabled={loading}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              loading={loading}
            >
              {t('delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
