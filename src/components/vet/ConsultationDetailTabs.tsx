'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { SOAPForm, type SOAPFormHandle } from './SOAPForm';
import { finishConsultation, type FinishOutcome, type OutcomeQuestion } from './finishConsultation';
import { formatIstTime } from '@/lib/time/ist';
import type { FinishChoice } from '@/lib/scheduling/outcomes';
import { TreatmentPlanBuilder } from './treatment-plan/TreatmentPlanBuilder';
import type { SoapNote } from '@/types';
import styles from './ConsultationDetailTabs.module.css';

type TabKey = 'overview' | 'soap' | 'rx';

// VC-1b: what the vet can say happened when Finish found no video call with
// the pet parent (server: decideFinishOutcome in lib/scheduling/outcomes).
const OUTCOME_OPTIONS: { choice: FinishChoice; label: string }[] = [
  { choice: 'happened_elsewhere', label: 'It happened another way (phone or WhatsApp)' },
  { choice: 'customer_no_show', label: "The pet parent didn't come" },
  { choice: 'technical_problem', label: "We couldn't connect (technical problem)" },
];

const FINISHED_MESSAGE: Record<FinishOutcome, string> = {
  success: 'Consultation completed',
  missed: 'Marked as missed: the pet parent didn’t come',
  failed: 'Closed. Our team has been told and will contact the pet parent.',
};

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

  // Set while the "we didn't see the pet parent" question is open (VC-1b).
  const [outcomeQuestion, setOutcomeQuestion] = useState<
    { isDiagnosisFromList: boolean; question: OutcomeQuestion } | null
  >(null);
  const [answering, setAnswering] = useState<FinishChoice | null>(null);
  // "It happened another way" picked before the notes were written (C2).
  const [notesFirst, setNotesFirst] = useState(false);
  // That answer, sent with the next Finish once the notes are saved (C2).
  const rememberedChoiceRef = useRef<FinishChoice | null>(null);

  // "Didn't come" may be waiting for start + 15 minutes: re-check while asked.
  const noShowAvailableAt = outcomeQuestion?.question.noShowAvailableAt ?? null;
  const [questionNow, setQuestionNow] = useState(() => Date.now());
  useEffect(() => {
    if (!noShowAvailableAt) return;
    const timer = setInterval(() => setQuestionNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, [noShowAvailableAt]);

  // One finish path for both buttons (C-02): the notes are already saved when
  // this runs; the server checks status, start time, the video call and the
  // notes, closes the consultation once, and sends what follows (follow-up
  // chat, emails and invite reward for a success; notices otherwise).
  const completeConsultation = useCallback(
    async (options: { isDiagnosisFromList: boolean; outcome?: FinishChoice }) => {
      setIsFinishing(true);
      const outcome = options.outcome ?? rememberedChoiceRef.current ?? undefined;
      try {
        const result = await finishConsultation(consultationId, { ...options, outcome });
        if (result.ok) {
          rememberedChoiceRef.current = null;
          setOutcomeQuestion(null);
          setIsCompleted(true);
          setAwaitingNotes(false);
          if (result.alreadyCompleted) {
            toast(
              result.notesSent
                ? 'Notes sent to the pet parent'
                : result.outcome === 'success'
                  ? 'This consultation was already completed'
                  : 'This consultation was already closed',
              'success'
            );
            router.refresh();
            return;
          }
          toast(FINISHED_MESSAGE[result.outcome], 'success');
          router.push('/consultations');
          router.refresh();
          return;
        }
        if (result.code === 'OUTCOME_NEEDED' && result.question) {
          // Nothing was recorded: ask the vet what happened, then send it again.
          rememberedChoiceRef.current = null;
          setNotesFirst(false);
          setOutcomeQuestion({ isDiagnosisFromList: options.isDiagnosisFromList, question: result.question });
          return;
        }
        if (result.code === 'OUTCOME_NOT_ALLOWED') {
          // The evidence doesn't back that answer (C1): say why, ask again.
          rememberedChoiceRef.current = null;
          toast(result.message, 'error');
          setOutcomeQuestion(
            result.question ? { isDiagnosisFromList: options.isDiagnosisFromList, question: result.question } : null
          );
          return;
        }
        setOutcomeQuestion(null);
        if (result.code === 'NOTES_REQUIRED') {
          // Keep her answer for the next Finish, once the notes are saved (C2).
          if (outcome) rememberedChoiceRef.current = outcome;
          handleTabChange('soap');
        }
        toast(result.message, 'error');
      } finally {
        setIsFinishing(false);
      }
    },
    [consultationId, handleTabChange, router, toast]
  );

  const answerOutcomeQuestion = async (choice: FinishChoice) => {
    if (!outcomeQuestion || answering) return;
    if (choice === 'happened_elsewhere' && !outcomeQuestion.question.notesComplete) {
      // The notes go to the pet parent: they must be written first (C2).
      setNotesFirst(true);
      return;
    }
    setAnswering(choice);
    try {
      await completeConsultation({ isDiagnosisFromList: outcomeQuestion.isDiagnosisFromList, outcome: choice });
    } finally {
      setAnswering(null);
    }
  };

  const goWriteNotes = () => {
    rememberedChoiceRef.current = 'happened_elsewhere';
    setNotesFirst(false);
    setOutcomeQuestion(null);
    handleTabChange('soap');
  };

  const closeOutcomeQuestion = () => {
    if (answering) return;
    setNotesFirst(false);
    setOutcomeQuestion(null);
  };

  const question = outcomeQuestion?.question ?? null;
  const noShowReady = !!noShowAvailableAt && questionNow >= Date.parse(noShowAvailableAt);
  // Each answer the evidence allows; "didn't come" also when only the
  // 15-minute wait stands in the way (shown disabled until then).
  const visibleOptions = OUTCOME_OPTIONS.filter(
    (option) =>
      question &&
      (question.allowedOutcomes.includes(option.choice) ||
        (option.choice === 'customer_no_show' && !!question.noShowAvailableAt))
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

      {/* VC-1b: Finish didn't see the two on the video call together. */}
      <Modal
        isOpen={question !== null}
        onClose={closeOutcomeQuestion}
        title={
          question?.customerSeen
            ? "You and the pet parent weren't on the video call at the same time"
            : "We didn't see the pet parent on the video call"
        }
        size="sm"
      >
        {notesFirst ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
              Add the chief complaint and a provisional diagnosis first: they go to the pet parent.
              We&apos;ll remember your answer. Save the notes, then press Finish again.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setNotesFirst(false)}>
                Back
              </Button>
              <Button variant="primary" onClick={goWriteNotes}>
                Write the notes
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
              What happened? We&apos;ll close the consultation to match. If it happened another way,
              your notes go to the pet parent as usual.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {visibleOptions.map((option) => {
                // "Didn't come" before start + 15 minutes: shown, not yet allowed (C1).
                const waiting =
                  option.choice === 'customer_no_show' &&
                  !question?.allowedOutcomes.includes(option.choice) &&
                  !noShowReady;
                return (
                  <div key={option.choice}>
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => answerOutcomeQuestion(option.choice)}
                      loading={answering === option.choice}
                      disabled={waiting || (answering !== null && answering !== option.choice)}
                    >
                      {option.label}
                    </Button>
                    {waiting && noShowAvailableAt && (
                      <p
                        style={{
                          margin: 'var(--space-1) 0 0',
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        Available at {formatIstTime(noShowAvailableAt)} — the pet parent may still join.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={closeOutcomeQuestion} disabled={answering !== null}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
