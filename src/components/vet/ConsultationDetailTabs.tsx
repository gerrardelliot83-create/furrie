'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { SOAPForm } from './SOAPForm';
import { TreatmentPlanBuilder } from './treatment-plan/TreatmentPlanBuilder';
import type { SoapNote } from '@/types';
import styles from './ConsultationDetailTabs.module.css';

type TabKey = 'overview' | 'soap' | 'rx';

interface ConsultationDetailTabsProps {
  consultationId: string;
  vetId: string;
  petSpecies: 'dog' | 'cat';
  initialSoapData?: Partial<SoapNote>;
  hasSoapNotes: boolean;
  isCompleted: boolean;
  /* Overview content passed as children */
  overviewContent: React.ReactNode;
}

export function ConsultationDetailTabs({
  consultationId,
  vetId,
  petSpecies,
  initialSoapData,
  hasSoapNotes: initialHasSoapNotes,
  isCompleted: initialIsCompleted,
  overviewContent,
}: ConsultationDetailTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Determine initial tab from URL
  const urlTab = searchParams.get('tab') as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(
    urlTab && ['overview', 'soap', 'rx'].includes(urlTab) ? urlTab : 'overview'
  );

  // Treatment plan state is owned by <TreatmentPlanBuilder>. We only track
  // the consultation-completion state and finishing spinner here.
  const [isFinishing, setIsFinishing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted);

  // Lazy-mount: only render TreatmentPlanBuilder once the rx tab has been
  // activated. This prevents it from firing its load useEffect at page mount
  // time (when SOAP notes may not yet exist), which would cause a stale
  // "Please complete SOAP notes" error. Once mounted, it stays mounted so
  // in-progress edits survive tab switches.
  const [rxMounted, setRxMounted] = useState(activeTab === 'rx');

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    if (tab === 'rx') setRxMounted(true);
    // Update URL without full navigation
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  }, []);

  const handleFinishConsultation = async () => {
    setIsFinishing(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('consultations')
        .update({
          status: 'closed',
          outcome: 'success',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', consultationId);

      if (error) throw new Error('Failed to complete consultation');

      // Non-blocking follow-up, analytics, and email
      fetch('/api/follow-up/thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId }),
      }).catch(() => {});

      fetch('/api/analytics/capture-treatment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId }),
      }).catch(() => {});

      fetch('/api/email/consultation-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId }),
      }).catch(() => {});

      // Check if this consultation's customer was an invitee completing
      // their first consultation — if so, grant the referrer a reward.
      fetch('/api/invites/check-referrer-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId }),
      }).catch(() => {});

      setIsCompleted(true);
      toast('Consultation completed successfully', 'success');
      router.push('/consultations');
    } catch (error) {
      console.error('Error finishing consultation:', error);
      toast(
        error instanceof Error ? error.message : 'Failed to complete consultation',
        'error'
      );
    } finally {
      setIsFinishing(false);
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'soap', label: 'SOAP Notes' },
    { key: 'rx', label: 'Treatment Plan' },
  ];

  return (
    <div className={styles.tabsContainer}>
      {/* Tab Bar */}
      <nav className={styles.tabBar} role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
            {tab.key === 'soap' && initialHasSoapNotes && (
              <span className={styles.tabDot} />
            )}
          </button>
        ))}
      </nav>

      {/* Tab Panels - using display none/block to preserve SOAP form state */}
      <div
        className={styles.tabPanel}
        style={{ display: activeTab === 'overview' ? 'block' : 'none' }}
        role="tabpanel"
      >
        {overviewContent}
      </div>

      <div
        className={styles.tabPanel}
        style={{ display: activeTab === 'soap' ? 'block' : 'none' }}
        role="tabpanel"
      >
        <SOAPForm
          consultationId={consultationId}
          vetId={vetId}
          petSpecies={petSpecies}
          initialData={initialSoapData}
        />
      </div>

      <div
        className={styles.tabPanel}
        style={{ display: activeTab === 'rx' ? 'block' : 'none' }}
        role="tabpanel"
      >
        <div className={styles.rxContent}>
          {/* Treatment Plan Builder (F1.4) — owns its own load/save/finalize.
              Lazy-mounted: only rendered once the rx tab has been opened. */}
          {rxMounted && <TreatmentPlanBuilder consultationId={consultationId} />}

          {/* Finish Consultation */}
          <div className={styles.rxFooter}>
            <Button
              variant="secondary"
              onClick={() => handleTabChange('soap')}
            >
              Back to SOAP Notes
            </Button>
            {isCompleted ? (
              <Button variant="secondary" disabled>
                Consultation Completed
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleFinishConsultation}
                loading={isFinishing}
              >
                {isFinishing ? 'Finishing...' : 'Finish Consultation'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
