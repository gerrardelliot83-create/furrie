'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { SOAPForm, type SOAPFormHandle } from './SOAPForm';
import { finishConsultation } from './finishConsultation';
import { formatIstTime } from '@/lib/time/ist';
import { TreatmentPlanBuilder } from './treatment-plan/TreatmentPlanBuilder';
import type { SoapNote } from '@/types';
import styles from './ConsultationDetailTabs.module.css';

type TabKey = 'overview' | 'soap' | 'rx';

interface ConsultationDetailTabsProps {
  consultationId: string;
  petSpecies: 'dog' | 'cat';
  initialSoapData?: Partial<SoapNote>;
  hasSoapNotes: boolean;
  isCompleted: boolean;
  /** Closed as a success, but the notes haven't been sent to the pet parent yet (no follow-up thread). */
  awaitingNotesDelivery: boolean;
  /** Closed with another outcome (missed, failed, cancelled): nothing to finish or send. */
  closedWithoutSuccess: boolean;
  /** Start time of a still-scheduled consultation; it can't be finished before then. */
  notBefore: string | null;
  /* Overview content passed as children */
  overviewContent: React.ReactNode;
}

export function ConsultationDetailTabs({
  consultationId,
  petSpecies,
  initialSoapData,
  hasSoapNotes: initialHasSoapNotes,
  isCompleted: initialIsCompleted,
  awaitingNotesDelivery: initialAwaitingNotes,
  closedWithoutSuccess,
  notBefore,
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
  const [awaitingNotes, setAwaitingNotes] = useState(initialAwaitingNotes);

  // Before the start time the server refuses to finish (409 NOT_STARTED), so
  // the buttons are disabled until then; re-checked every 30 s (review item 6).
  const startsAtMs = notBefore ? new Date(notBefore).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startsAtMs === null || isCompleted) return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [startsAtMs, isCompleted]);
  const notStartedYet = !isCompleted && startsAtMs !== null && now < startsAtMs;

  // What the finish buttons do: finish the consultation, send late notes
  // (closed by the cron before the notes were written), or nothing yet.
  const finishAction: 'finish' | 'send_notes' | 'none' = notStartedYet
    ? 'none'
    : !isCompleted
      ? 'finish'
      : awaitingNotes && !closedWithoutSuccess
        ? 'send_notes'
        : 'none';
  const closedLabel = notStartedYet && notBefore
    ? `Finish from ${formatIstTime(notBefore)}`
    : closedWithoutSuccess
      ? 'Consultation Closed'
      : 'Consultation Completed';

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

  const soapFormRef = useRef<SOAPFormHandle>(null);

  // One finish path for both buttons (C-02): the notes are already saved when
  // this runs; the server checks status, start time and notes, closes the
  // consultation once, and sends the follow-up chat, emails and invite reward.
  const completeConsultation = useCallback(
    async (options: { isDiagnosisFromList: boolean }) => {
      setIsFinishing(true);
      try {
        const result = await finishConsultation(consultationId, options);
        if (result.ok) {
          setIsCompleted(true);
          setAwaitingNotes(false);
          if (result.alreadyCompleted) {
            toast(
              result.notesSent ? 'Notes sent to the pet parent' : 'This consultation was already completed',
              'success'
            );
            router.refresh();
            return;
          }
          toast('Consultation completed', 'success');
          router.push('/consultations');
          router.refresh();
          return;
        }
        if (result.code === 'NOTES_REQUIRED') {
          handleTabChange('soap');
        }
        toast(result.message, 'error');
      } finally {
        setIsFinishing(false);
      }
    },
    [consultationId, handleTabChange, router, toast]
  );

  // Treatment Plan tab: save whatever is in the SOAP form first.
  const handleFinishConsultation = async () => {
    if (isFinishing) return;
    const soapForm = soapFormRef.current;
    if (soapForm) {
      const saved = await soapForm.saveBeforeFinish();
      if (!saved) return;
    }
    await completeConsultation({ isDiagnosisFromList: soapForm?.isDiagnosisFromList() ?? false });
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
          ref={soapFormRef}
          consultationId={consultationId}
          petSpecies={petSpecies}
          initialData={initialSoapData}
          finishAction={finishAction}
          closedLabel={closedLabel}
          isFinishing={isFinishing}
          onComplete={completeConsultation}
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
            {finishAction === 'none' ? (
              <Button variant="secondary" disabled>
                {closedLabel}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleFinishConsultation}
                loading={isFinishing}
              >
                {finishAction === 'send_notes'
                  ? 'Send notes to the pet parent'
                  : isFinishing
                    ? 'Finishing...'
                    : 'Finish Consultation'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
