'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { StepResponseForm } from '@/components/customer/StepResponseForm';
import styles from './page.module.css';

interface PageProps {
  params: Promise<{ petId: string; planId: string }>;
}

const STEP_TYPE_LABELS: Record<string, string> = {
  medication: 'Medication',
  supplement: 'Supplement',
  test: 'Test/Lab',
  vaccination: 'Vaccination',
  nutrition: 'Nutrition',
  exercise: 'Exercise',
  video_check_in: 'Video Check-in',
  custom: 'Custom',
};

interface PlanData {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  created_at: string;
  pet_id: string;
  totalSteps: number;
  completedSteps: number;
  vet: { id: string; full_name: string } | null;
  care_plan_steps: StepData[];
}

interface StepData {
  id: string;
  title: string;
  instructions: string | null;
  step_type: string;
  step_order: number;
  due_date: string | null;
  requires_response: boolean;
  status: string;
  completed_at: string | null;
  care_plan_step_responses: Array<{
    id: string;
    response_text: string | null;
    media_urls: string[];
    media_types: string[];
    created_at: string;
  }>;
}

export default function CustomerCarePlanDetailPage({ params }: PageProps) {
  const { petId, planId } = use(params);
  const { toast } = useToast();

  const [plan, setPlan] = useState<PlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [completingStepId, setCompletingStepId] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    try {
      const response = await fetch(`/api/care-plans/${planId}`);
      if (!response.ok) throw new Error('Failed to fetch plan');
      const result = await response.json();
      setPlan(result.data);
    } catch (error) {
      console.error('Error fetching plan:', error);
      toast('Failed to load care plan', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [planId, toast]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const handleMarkDone = async (stepId: string) => {
    setCompletingStepId(stepId);
    try {
      const response = await fetch(`/api/care-plans/${planId}/steps/${stepId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to complete step');
      }

      toast('Step completed', 'success');
      fetchPlan();
    } catch (error) {
      console.error('Error completing step:', error);
      toast(
        error instanceof Error ? error.message : 'Failed to complete step',
        'error'
      );
    } finally {
      setCompletingStepId(null);
    }
  };

  const handleResponseSubmit = async (stepId: string, responseText: string, mediaUrls: string[], mediaTypes: string[]) => {
    setCompletingStepId(stepId);
    try {
      const response = await fetch(`/api/care-plans/${planId}/steps/${stepId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseText, mediaUrls, mediaTypes }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to submit response');
      }

      toast('Response submitted', 'success');
      setExpandedStep(null);
      fetchPlan();
    } catch (error) {
      console.error('Error submitting response:', error);
      toast(
        error instanceof Error ? error.message : 'Failed to submit response',
        'error'
      );
    } finally {
      setCompletingStepId(null);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className={styles.container}>
        <p>Care plan not found.</p>
        <Link href={`/pets/${petId}`}>Back to Pet Profile</Link>
      </div>
    );
  }

  const progress = plan.totalSteps > 0
    ? Math.round((plan.completedSteps / plan.totalSteps) * 100)
    : 0;

  return (
    <div className={styles.container}>
      <Link href={`/pets/${petId}`} className={styles.backLink}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Pet Profile
      </Link>

      {/* Plan Info */}
      <div className={styles.planInfo}>
        <h1 className={styles.title}>{plan.title}</h1>
        <div className={styles.planMeta}>
          <Badge variant={plan.status === 'completed' ? 'success' : 'info'} size="sm">
            {plan.status === 'completed' ? 'Completed' : 'Active'}
          </Badge>
          <span className={styles.categoryLabel}>
            {plan.category.charAt(0).toUpperCase() + plan.category.slice(1)} Care
          </span>
          {plan.vet && (
            <span className={styles.vetLabel}>
              By Dr. {plan.vet.full_name}
            </span>
          )}
        </div>
        {plan.description && (
          <p className={styles.description}>{plan.description}</p>
        )}
      </div>

      {/* Progress Bar */}
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span className={styles.progressLabel}>
            {plan.completedSteps} of {plan.totalSteps} steps completed
          </span>
          <span className={styles.progressPercent}>{progress}%</span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps Checklist */}
      <div className={styles.stepsList}>
        {plan.care_plan_steps?.map((step) => {
          const isCompleted = step.status === 'completed';
          const isVideoCheckIn = step.step_type === 'video_check_in';
          const isExpanded = expandedStep === step.id;
          const isCompletingThis = completingStepId === step.id;
          const isPastDue = step.due_date && !isCompleted && new Date(step.due_date) < new Date();

          return (
            <Card key={step.id}>
              <CardContent>
                <div className={styles.stepRow}>
                  <div className={styles.stepStatusCircle} data-status={step.status}>
                    {isCompleted && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <div className={styles.stepContent}>
                    <div className={styles.stepHeader}>
                      <h3 className={`${styles.stepTitle} ${isCompleted ? styles.stepTitleCompleted : ''}`}>
                        {step.title}
                      </h3>
                    </div>

                    <div className={styles.stepMeta}>
                      <Badge variant="neutral" size="sm">
                        {STEP_TYPE_LABELS[step.step_type] || step.step_type}
                      </Badge>
                      {step.due_date && (
                        <span className={`${styles.dueDate} ${isPastDue ? styles.dueDateOverdue : ''}`}>
                          Due: {new Date(step.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {step.requires_response && !isCompleted && (
                        <Badge variant="warning" size="sm">Response Required</Badge>
                      )}
                    </div>

                    {step.instructions && (
                      <p className={styles.stepInstructions}>{step.instructions}</p>
                    )}

                    {/* Show existing responses */}
                    {step.care_plan_step_responses && step.care_plan_step_responses.length > 0 && (
                      <div className={styles.existingResponses}>
                        {step.care_plan_step_responses.map((resp) => (
                          <div key={resp.id} className={styles.responseItem}>
                            {resp.response_text && (
                              <p className={styles.responseText}>{resp.response_text}</p>
                            )}
                            {resp.media_urls && resp.media_urls.length > 0 && (
                              <span className={styles.responseMediaCount}>
                                {resp.media_urls.length} file{resp.media_urls.length > 1 ? 's' : ''} attached
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action area */}
                    {!isCompleted && (
                      <div className={styles.stepActions}>
                        {isVideoCheckIn ? (
                          <Link href={`/connect?petId=${petId}`}>
                            <Button variant="secondary" size="sm">
                              Book Video Check-in
                            </Button>
                          </Link>
                        ) : step.requires_response ? (
                          isExpanded ? (
                            <StepResponseForm
                              onSubmit={(text, urls, types) => handleResponseSubmit(step.id, text, urls, types)}
                              onCancel={() => setExpandedStep(null)}
                              isSubmitting={isCompletingThis}
                            />
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setExpandedStep(step.id)}
                            >
                              Add Response & Complete
                            </Button>
                          )
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleMarkDone(step.id)}
                            loading={isCompletingThis}
                          >
                            Mark Done
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
