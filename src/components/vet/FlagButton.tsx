'use client';

import { useState } from 'react';
import { FlagConsultationModal } from './FlagConsultationModal';

interface FlagButtonProps {
  consultationId: string;
  className?: string;
}

export function FlagButton({ consultationId, className }: FlagButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setIsModalOpen(true)}
      >
        Flag Consultation
      </button>
      <FlagConsultationModal
        consultationId={consultationId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
