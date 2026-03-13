'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';
import { DetailPanel } from '@/components/ui/DetailPanel/DetailPanel';
import { CarePlanDetailContent } from '@/components/customer/CarePlanDetailContent';
import { useDetailPanel } from '@/hooks/useDetailPanel';
import styles from './CarePlanList.module.css';

interface CarePlan {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  created_at: string;
  pet_id: string;
  totalSteps: number;
  completedSteps: number;
  pets: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    photo_urls: string[];
  } | null;
  vet: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface PetOption {
  id: string;
  name: string;
  species: string;
}

type StatusFilter = 'all' | 'active' | 'completed';

interface CarePlanListProps {
  initialPlans: CarePlan[];
  pets: PetOption[];
}

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

export function CarePlanList({ initialPlans, pets }: CarePlanListProps) {
  const [selectedPetId, setSelectedPetId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const panel = useDetailPanel();

  // Filter plans
  const filteredPlans = useMemo(() => {
    return initialPlans.filter((plan) => {
      if (selectedPetId !== 'all' && plan.pet_id !== selectedPetId) return false;
      if (statusFilter !== 'all' && plan.status !== statusFilter) return false;
      return true;
    });
  }, [initialPlans, selectedPetId, statusFilter]);

  const handleCardClick = (planId: string) => {
    panel.openCarePlanDetail(planId);
  };

  return (
    <>
      {/* Filters */}
      <div className={styles.filters}>
        {/* Pet filter */}
        <select
          className={styles.petFilter}
          value={selectedPetId}
          onChange={(e) => setSelectedPetId(e.target.value)}
          aria-label="Filter by pet"
        >
          <option value="all">All Pets</option>
          {pets.map((pet) => (
            <option key={pet.id} value={pet.id}>
              {pet.name}
            </option>
          ))}
        </select>

        {/* Status tabs */}
        <nav className={styles.tabBar} role="tablist">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.tab} ${statusFilter === tab.key ? styles.tabActive : ''}`}
              role="tab"
              aria-selected={statusFilter === tab.key}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Plan Cards */}
      {filteredPlans.length === 0 ? (
        <div className={styles.emptyState}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={styles.emptyIcon}
          >
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 14l2 2 4-4" />
          </svg>
          <p className={styles.emptyText}>
            {statusFilter === 'all'
              ? 'No care plans yet'
              : `No ${statusFilter} care plans`}
          </p>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {filteredPlans.map((plan) => {
            const progress =
              plan.totalSteps > 0
                ? Math.round((plan.completedSteps / plan.totalSteps) * 100)
                : 0;

            return (
              <button
                key={plan.id}
                className={styles.planCard}
                onClick={() => handleCardClick(plan.id)}
                type="button"
              >
                {/* Pet + Status row */}
                <div className={styles.cardTopRow}>
                  <div className={styles.cardPet}>
                    {plan.pets?.photo_urls?.[0] ? (
                      <div className={styles.cardPetAvatar}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={plan.pets.photo_urls[0]}
                          alt={plan.pets.name}
                          className={styles.cardPetAvatarImg}
                        />
                      </div>
                    ) : (
                      <div className={styles.cardPetAvatarFallback}>
                        {plan.pets?.species === 'dog' ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <circle cx="6" cy="8" r="2" />
                            <circle cx="18" cy="8" r="2" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <circle cx="6" cy="8" r="2" />
                            <circle cx="18" cy="8" r="2" />
                          </svg>
                        )}
                      </div>
                    )}
                    <span className={styles.cardPetName}>
                      {plan.pets?.name || 'Unknown Pet'}
                    </span>
                  </div>
                  <Badge
                    variant={plan.status === 'completed' ? 'success' : 'info'}
                    size="sm"
                  >
                    {plan.status === 'completed' ? 'Completed' : 'Active'}
                  </Badge>
                </div>

                {/* Plan Title */}
                <h3 className={styles.cardTitle}>{plan.title}</h3>

                {/* Category + Vet */}
                <div className={styles.cardMeta}>
                  <Badge variant="neutral" size="sm">
                    {plan.category.charAt(0).toUpperCase() + plan.category.slice(1)}
                  </Badge>
                  {plan.vet && (
                    <span className={styles.cardVet}>
                      Dr. {plan.vet.full_name}
                    </span>
                  )}
                </div>

                {/* Progress */}
                <div className={styles.cardProgress}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className={styles.progressText}>
                    {plan.completedSteps}/{plan.totalSteps}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail Panel */}
      <DetailPanel
        isOpen={panel.isOpen && panel.contentType === 'care-plan-detail'}
        title="Care Plan"
        onClose={panel.close}
        size={panel.panelSize}
        onToggleSize={panel.toggleSize}
      >
        {panel.entityId && panel.contentType === 'care-plan-detail' && (
          <CarePlanDetailContent planId={panel.entityId} />
        )}
      </DetailPanel>
    </>
  );
}
