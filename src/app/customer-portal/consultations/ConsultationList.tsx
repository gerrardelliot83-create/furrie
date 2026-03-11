'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ConsultationWithRelations } from '@/lib/utils/consultationMapper';
import type { ConsultationStatus, ConsultationOutcome } from '@/types';
import { getStatusVariant, getStatusDisplayText } from '@/lib/utils/statusHelpers';
import { formatDate, formatTime } from '@/lib/utils';
import { useDetailPanel } from '@/hooks/useDetailPanel';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DetailPanel } from '@/components/ui/DetailPanel';
import { ConsultationDetailContent } from '@/components/customer/ConsultationDetailContent';
import { ConsultationChatContent } from '@/components/customer/ConsultationChatContent';
import { EditConcernForm } from '@/components/customer/EditConcernForm';
import styles from './Consultations.module.css';

interface FollowUpMeta {
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageRole: string | null;
  unreadCount: number;
}

interface ConsultationListProps {
  consultations: ConsultationWithRelations[];
  activeTab: 'upcoming' | 'past' | 'follow-ups';
  currentPage: number;
  totalPages: number;
  followUpMeta?: Record<string, FollowUpMeta>;
}

function formatDuration(startedAt: string | null | undefined, endedAt: string | null | undefined): string {
  if (!startedAt || !endedAt) return '-';
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.round(diffMs / 60000);
  return `${diffMins} min`;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return formatDate(dateStr);
}

export function ConsultationList({
  consultations,
  activeTab,
  currentPage,
  totalPages,
  followUpMeta,
}: ConsultationListProps) {
  const t = useTranslations('consultation');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const panel = useDetailPanel();
  const { user } = useAuth();

  // Track which consultation is selected for edit concern form
  const [detailKey, setDetailKey] = useState(0);

  const handleRowClick = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    panel.openConsultationDetail(id);
  }, [panel]);

  const handleEditSuccess = useCallback(() => {
    panel.switchToDetail();
    setDetailKey((k) => k + 1);
  }, [panel]);

  const handleEditCancel = useCallback(() => {
    panel.switchToDetail();
  }, [panel]);

  const handleCancelSuccess = useCallback(() => {
    panel.close();
    router.refresh();
  }, [panel, router]);

  const handleOpenChat = useCallback(() => {
    panel.switchToChat();
  }, [panel]);

  const handleBackFromChat = useCallback(() => {
    panel.switchToDetail();
  }, [panel]);

  // Get the selected consultation for edit form
  const selectedConsultation = panel.entityId
    ? consultations.find((c) => c.id === panel.entityId)
    : null;

  // Panel title based on content type
  const getPanelTitle = () => {
    if (panel.contentType === 'consultation-edit') return 'Edit Concern';
    if (panel.contentType === 'consultation-chat') return 'Follow-up Chat';
    if (selectedConsultation) {
      return `${selectedConsultation.pet?.name || 'Consultation'} - ${selectedConsultation.consultationNumber}`;
    }
    return 'Consultation Details';
  };

  // Header actions
  const headerActions = panel.contentType === 'consultation-detail' && selectedConsultation
    && ['pending', 'scheduled'].includes(selectedConsultation.status)
    ? (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => panel.switchToEdit()}
      >
        {tCommon('edit')}
      </Button>
    )
    : null;

  // Determine if we're showing the panel
  const isPanelOpen = panel.isOpen && (
    panel.contentType === 'consultation-detail' ||
    panel.contentType === 'consultation-edit' ||
    panel.contentType === 'consultation-chat'
  );

  if (consultations.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <p className={styles.emptyText}>
          {activeTab === 'upcoming'
            ? 'No upcoming consultations'
            : activeTab === 'past'
              ? 'No past consultations yet'
              : 'No active follow-up conversations'}
        </p>
        {activeTab === 'upcoming' && (
          <Link href="/connect">
            <Button variant="secondary" size="sm">
              {t('startConsultation')}
            </Button>
          </Link>
        )}
      </div>
    );
  }

  // Follow-ups tab: render chat-style cards
  if (activeTab === 'follow-ups' && followUpMeta) {
    return (
      <>
        {/* Chat-style cards for follow-ups */}
        <div className={styles.followUpList}>
          {consultations.map((consultation) => {
            const meta = followUpMeta[consultation.id];
            const hasUnread = meta && meta.unreadCount > 0;

            return (
              <button
                key={consultation.id}
                type="button"
                className={styles.followUpCard}
                onClick={() => panel.openConsultationDetail(consultation.id)}
              >
                <div className={styles.followUpCardLeft}>
                  <div className={styles.followUpAvatar}>
                    {consultation.vet?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={consultation.vet.avatarUrl}
                        alt={consultation.vet.fullName}
                        className={styles.followUpAvatarImg}
                      />
                    ) : (
                      <span className={styles.followUpAvatarFallback}>
                        {consultation.vet?.fullName?.charAt(0) || 'V'}
                      </span>
                    )}
                  </div>
                  <div className={styles.followUpInfo}>
                    <div className={styles.followUpTopRow}>
                      <span className={styles.followUpVetName}>
                        {consultation.vet ? `Dr. ${consultation.vet.fullName}` : 'Veterinarian'}
                      </span>
                      {meta?.lastMessageAt && (
                        <span className={styles.followUpTime}>
                          {formatRelativeTime(meta.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <span className={styles.followUpPet}>
                      Re: {consultation.pet?.name || 'Pet'} ({consultation.pet?.breed || ''})
                    </span>
                    {meta?.lastMessage && (
                      <span className={`${styles.followUpPreview} ${meta.lastMessageRole === 'vet' ? styles.followUpPreviewVet : ''}`}>
                        {meta.lastMessage.length > 80 ? `${meta.lastMessage.slice(0, 80)}...` : meta.lastMessage}
                      </span>
                    )}
                  </div>
                </div>
                {hasUnread && (
                  <div className={styles.followUpUnread}>
                    <span className={styles.unreadBadge}>{meta.unreadCount}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Detail / Edit / Chat Panel */}
        <DetailPanel
          isOpen={isPanelOpen}
          onClose={panel.close}
          title={getPanelTitle()}
          size={panel.panelSize}
          onToggleSize={panel.toggleSize}
          headerActions={headerActions}
        >
          {panel.entityId && panel.contentType === 'consultation-detail' && (
            <ConsultationDetailContent
              key={detailKey}
              consultationId={panel.entityId}
              onCancelSuccess={handleCancelSuccess}
              onOpenChat={handleOpenChat}
            />
          )}
          {panel.entityId && panel.contentType === 'consultation-chat' && user && (
            <ConsultationChatContent
              consultationId={panel.entityId}
              currentUserId={user.id}
              onBack={handleBackFromChat}
            />
          )}
          {panel.entityId && panel.contentType === 'consultation-edit' && selectedConsultation && (
            <EditConcernForm
              consultationId={panel.entityId}
              initialConcern={selectedConsultation.concernText || ''}
              initialSymptoms={selectedConsultation.symptomCategories || []}
              onSuccess={handleEditSuccess}
              onCancel={handleEditCancel}
            />
          )}
        </DetailPanel>
      </>
    );
  }

  return (
    <>
      {/* Desktop Table - hidden on mobile */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead className={styles.tableHead}>
            <tr>
              <th className={styles.tableHeader}>Date & Time</th>
              <th className={styles.tableHeader}>Pet</th>
              <th className={styles.tableHeader}>Vet</th>
              <th className={styles.tableHeader}>Concern</th>
              <th className={styles.tableHeader}>Status</th>
              {activeTab === 'past' && (
                <th className={styles.tableHeader}>Duration</th>
              )}
            </tr>
          </thead>
          <tbody>
            {consultations.map((consultation) => {
              const displayDate = consultation.scheduledAt || consultation.createdAt;
              const statusVariant = getStatusVariant(
                consultation.status as ConsultationStatus,
                consultation.outcome as ConsultationOutcome | null
              );
              const statusText = getStatusDisplayText(
                consultation.status as ConsultationStatus,
                consultation.outcome as ConsultationOutcome | null
              );

              return (
                <tr key={consultation.id} className={styles.tableRow}>
                  <td className={styles.tableCell}>
                    <Link
                      href={`/consultations/${consultation.id}`}
                      className={styles.rowLink}
                      onClick={(e) => handleRowClick(e, consultation.id)}
                    >
                      <div className={styles.dateTime}>
                        <span className={styles.date} suppressHydrationWarning>
                          {formatDate(displayDate)}
                        </span>
                        <span className={styles.time} suppressHydrationWarning>
                          {formatTime(displayDate)}
                        </span>
                      </div>
                    </Link>
                  </td>
                  <td className={styles.tableCell}>
                    <Link
                      href={`/consultations/${consultation.id}`}
                      className={styles.rowLink}
                      onClick={(e) => handleRowClick(e, consultation.id)}
                    >
                      <div className={styles.petCell}>
                        <div className={styles.petAvatar}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={consultation.pet?.species === 'dog' ? '/assets/dog-avatar.png' : '/assets/cat-avatar.png'}
                            alt={consultation.pet?.species === 'dog' ? 'Dog' : 'Cat'}
                            className={styles.petAvatarImg}
                          />
                        </div>
                        <div className={styles.petInfo}>
                          <span className={styles.petName}>
                            {consultation.pet?.name || 'Unknown'}
                          </span>
                          <span className={styles.petBreed}>
                            {consultation.pet?.breed || 'Unknown breed'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className={styles.tableCell}>
                    <Link
                      href={`/consultations/${consultation.id}`}
                      className={styles.rowLink}
                      onClick={(e) => handleRowClick(e, consultation.id)}
                    >
                      {consultation.vet ? `Dr. ${consultation.vet.fullName}` : '-'}
                    </Link>
                  </td>
                  <td className={styles.tableCell}>
                    <Link
                      href={`/consultations/${consultation.id}`}
                      className={styles.rowLink}
                      onClick={(e) => handleRowClick(e, consultation.id)}
                    >
                      <span className={styles.concernText}>
                        {consultation.concernText || '-'}
                      </span>
                    </Link>
                  </td>
                  <td className={styles.tableCell}>
                    <Badge variant={statusVariant} size="sm">
                      {statusText}
                    </Badge>
                  </td>
                  {activeTab === 'past' && (
                    <td className={styles.tableCell}>
                      {formatDuration(consultation.startedAt, consultation.endedAt)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards - hidden on desktop */}
      <div className={styles.mobileList}>
        {consultations.map((consultation) => {
          const displayDate = consultation.scheduledAt || consultation.createdAt;
          const statusVariant = getStatusVariant(
            consultation.status as ConsultationStatus,
            consultation.outcome as ConsultationOutcome | null
          );
          const statusText = getStatusDisplayText(
            consultation.status as ConsultationStatus,
            consultation.outcome as ConsultationOutcome | null
          );

          return (
            <Link
              key={consultation.id}
              href={`/consultations/${consultation.id}`}
              className={styles.mobileCard}
              onClick={(e) => handleRowClick(e, consultation.id)}
            >
              <div className={styles.mobileCardTop}>
                <div className={styles.mobilePetCell}>
                  <div className={styles.petAvatar}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={consultation.pet?.species === 'dog' ? '/assets/dog-avatar.png' : '/assets/cat-avatar.png'}
                      alt={consultation.pet?.species === 'dog' ? 'Dog' : 'Cat'}
                      className={styles.petAvatarImg}
                    />
                  </div>
                  <div className={styles.petInfo}>
                    <span className={styles.petName}>
                      {consultation.pet?.name || 'Unknown'}
                    </span>
                    <span className={styles.petBreed}>
                      {consultation.pet?.breed || 'Unknown breed'}
                    </span>
                  </div>
                </div>
                <Badge variant={statusVariant} size="sm">
                  {statusText}
                </Badge>
              </div>

              <div className={styles.mobileCardDetails}>
                <div className={styles.mobileDetailRow}>
                  <span className={styles.mobileLabel}>Date</span>
                  <span className={styles.mobileValue} suppressHydrationWarning>
                    {formatDate(displayDate)}, {formatTime(displayDate)}
                  </span>
                </div>
                {consultation.vet && (
                  <div className={styles.mobileDetailRow}>
                    <span className={styles.mobileLabel}>Vet</span>
                    <span className={styles.mobileValue}>
                      Dr. {consultation.vet.fullName}
                    </span>
                  </div>
                )}
                {consultation.concernText && (
                  <div className={styles.mobileDetailRow}>
                    <span className={styles.mobileLabel}>Concern</span>
                    <span className={styles.mobileConcern}>
                      {consultation.concernText}
                    </span>
                  </div>
                )}
                {activeTab === 'past' && consultation.startedAt && consultation.endedAt && (
                  <div className={styles.mobileDetailRow}>
                    <span className={styles.mobileLabel}>Duration</span>
                    <span className={styles.mobileValue}>
                      {formatDuration(consultation.startedAt, consultation.endedAt)}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.mobileChevron}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          {currentPage > 1 && (
            <Link
              href={`/consultations?${new URLSearchParams({
                tab: activeTab,
                page: String(currentPage - 1),
              }).toString()}`}
              className={styles.paginationButton}
            >
              Previous
            </Link>
          )}
          <span className={styles.paginationInfo}>
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={`/consultations?${new URLSearchParams({
                tab: activeTab,
                page: String(currentPage + 1),
              }).toString()}`}
              className={styles.paginationButton}
            >
              Next
            </Link>
          )}
        </div>
      )}

      {/* Detail / Edit / Chat Panel */}
      <DetailPanel
        isOpen={isPanelOpen}
        onClose={panel.close}
        title={getPanelTitle()}
        size={panel.panelSize}
        onToggleSize={panel.toggleSize}
        headerActions={headerActions}
      >
        {panel.entityId && panel.contentType === 'consultation-detail' && (
          <ConsultationDetailContent
            key={detailKey}
            consultationId={panel.entityId}
            onCancelSuccess={handleCancelSuccess}
            onOpenChat={handleOpenChat}
          />
        )}
        {panel.entityId && panel.contentType === 'consultation-chat' && user && (
          <ConsultationChatContent
            consultationId={panel.entityId}
            currentUserId={user.id}
            onBack={handleBackFromChat}
          />
        )}
        {panel.entityId && panel.contentType === 'consultation-edit' && selectedConsultation && (
          <EditConcernForm
            consultationId={panel.entityId}
            initialConcern={selectedConsultation.concernText || ''}
            initialSymptoms={selectedConsultation.symptomCategories || []}
            onSuccess={handleEditSuccess}
            onCancel={handleEditCancel}
          />
        )}
      </DetailPanel>
    </>
  );
}
