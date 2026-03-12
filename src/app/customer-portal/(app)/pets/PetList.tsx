'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { Pet } from '@/types';
import { usePets } from '@/hooks/usePets';
import { useDetailPanel } from '@/hooks/useDetailPanel';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { DetailPanel } from '@/components/ui/DetailPanel';
import { Button } from '@/components/ui/Button';
import { PetCard } from '@/components/customer/PetCard';
import { PetDetailContent } from '@/components/customer/PetDetailContent';
import { PetForm } from '@/components/customer/PetForm';
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

  // Detail panel state
  const panel = useDetailPanel();

  // Force re-render of detail content after edit
  const [detailKey, setDetailKey] = useState(0);

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
      // Close panel if the deleted pet was being viewed
      if (panel.entityId === petToDelete.id) {
        panel.close();
      }
    }

    setDeleteModalOpen(false);
    setPetToDelete(null);
  }, [petToDelete, deletePet, success, showError, panel]);

  const handleCancelDelete = useCallback(() => {
    setDeleteModalOpen(false);
    setPetToDelete(null);
  }, []);

  // Panel click handlers
  const handleCardClick = useCallback((id: string) => {
    panel.openPetDetail(id);
  }, [panel]);

  // Edit success handler — refresh detail view and update pets list
  const handleEditSuccess = useCallback((updatedPet: Pet) => {
    setPets((prev) => prev.map((p) => p.id === updatedPet.id ? updatedPet : p));
    panel.switchToDetail();
    setDetailKey((k) => k + 1);
    success(`${updatedPet.name} updated`);
  }, [panel, success]);

  const handleEditCancel = useCallback(() => {
    panel.switchToDetail();
  }, [panel]);

  // Get panel title
  const panelPet = panel.entityId ? pets.find((p) => p.id === panel.entityId) : null;
  const panelTitle = panel.contentType === 'pet-edit'
    ? `Edit ${panelPet?.name || 'Pet'}`
    : panelPet?.name || 'Pet Details';

  // Header actions for the panel
  const headerActions = panel.contentType === 'pet-detail' ? (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => panel.switchToEdit()}
    >
      {t('edit')}
    </Button>
  ) : null;

  return (
    <>
      <div className={styles.grid}>
        {pets.map((pet) => (
          <PetCard
            key={pet.id}
            pet={pet}
            onCardClick={handleCardClick}
          />
        ))}
      </div>

      {/* Detail / Edit Panel */}
      <DetailPanel
        isOpen={panel.isOpen && (panel.contentType === 'pet-detail' || panel.contentType === 'pet-edit')}
        onClose={panel.close}
        title={panelTitle}
        size={panel.panelSize}
        onToggleSize={panel.toggleSize}
        headerActions={headerActions}
      >
        {panel.entityId && panel.contentType === 'pet-detail' && (
          <PetDetailContent key={detailKey} petId={panel.entityId} onDelete={handleDeleteClick} />
        )}
        {panel.entityId && panel.contentType === 'pet-edit' && panelPet && (
          <PetForm
            pet={panelPet}
            mode="edit"
            onSuccess={handleEditSuccess}
            onCancel={handleEditCancel}
          />
        )}
      </DetailPanel>

      {/* Delete Modal — stacks on top of panel due to higher z-index */}
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
