'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { StepResponseViewer } from '@/components/vet/StepResponseViewer';
import type { CarePlanStepType } from '@/types';
import styles from './page.module.css';

interface PageProps {
  params: Promise<{ id: string; planId: string }>;
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

const VALID_STEP_TYPES: CarePlanStepType[] = [
  'medication', 'supplement', 'test', 'vaccination', 'nutrition', 'exercise', 'video_check_in', 'custom',
];

interface CarePlanData {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  created_at: string;
  pet_id: string;
  vet_id: string;
  totalSteps: number;
  completedSteps: number;
  pets: { id: string; name: string; species: string };
  customer: { id: string; full_name: string };
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
  care_plan_step_responses: ResponseData[];
}

interface ResponseData {
  id: string;
  user_id: string;
  response_text: string | null;
  media_urls: string[];
  media_types: string[];
  created_at: string;
}

export default function VetCarePlanDetailPage({ params }: PageProps) {
  const { id: petId, planId } = use(params);
  const { toast } = useToast();

  const [plan, setPlan] = useState<CarePlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Add step form
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepInstructions, setNewStepInstructions] = useState('');
  const [newStepType, setNewStepType] = useState<CarePlanStepType>('custom');
  const [newStepDueDate, setNewStepDueDate] = useState('');
  const [newStepRequiresResponse, setNewStepRequiresResponse] = useState(false);
  const [isAddingStep, setIsAddingStep] = useState(false);

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

  const updatePlanStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/care-plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update plan');

      toast(`Plan marked as ${newStatus}`, 'success');
      fetchPlan();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast('Failed to update plan', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddStep = async () => {
    if (!newStepTitle.trim()) {
      toast('Step title is required', 'error');
      return;
    }

    setIsAddingStep(true);
    try {
      const response = await fetch(`/api/care-plans/${planId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newStepTitle.trim(),
          instructions: newStepInstructions.trim() || null,
          stepType: newStepType,
          dueDate: newStepDueDate || null,
          requiresResponse: newStepRequiresResponse,
        }),
      });

      if (!response.ok) throw new Error('Failed to add step');

      toast('Step added successfully', 'success');
      setNewStepTitle('');
      setNewStepInstructions('');
      setNewStepType('custom');
      setNewStepDueDate('');
      setNewStepRequiresResponse(false);
      setShowAddStep(false);
      fetchPlan();
    } catch (error) {
      console.error('Error adding step:', error);
      toast('Failed to add step', 'error');
    } finally {
      setIsAddingStep(false);
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
        <Link href={`/patients/${petId}`}>Back to Patient</Link>
      </div>
    );
  }

  const progress = plan.totalSteps > 0
    ? Math.round((plan.completedSteps / plan.totalSteps) * 100)
    : 0;

  const statusVariantMap: Record<string, 'info' | 'success' | 'neutral'> = {
    draft: 'neutral',
    active: 'info',
    completed: 'success',
    archived: 'neutral',
  };

  return (
    <div className={styles.container}>
      <Link href={`/patients/${petId}`} className={styles.backLink}>
        Back to Patient
      </Link>

      {/* Plan Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>{plan.title}</h1>
          <p className={styles.subtitle}>
            {plan.category.charAt(0).toUpperCase() + plan.category.slice(1)} Care
            {plan.customer && <> &middot; {plan.customer.full_name}</>}
          </p>
        </div>
        <Badge variant={statusVariantMap[plan.status] || 'neutral'} size="md">
          {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
        </Badge>
      </div>

      {plan.description && (
        <p className={styles.description}>{plan.description}</p>
      )}

      {/* Progress */}
      {plan.totalSteps > 0 && (
        <div className={styles.progressSection}>
          <div className={styles.progressInfo}>
            <span className={styles.progressLabel}>Progress</span>
            <span className={styles.progressCount}>
              {plan.completedSteps} of {plan.totalSteps} steps completed
            </span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      <div className={styles.stepsSection}>
        <h2 className={styles.sectionTitle}>Steps</h2>

        {plan.care_plan_steps?.map((step) => (
          <Card key={step.id}>
            <CardContent>
              <div className={styles.stepHeader}>
                <div className={styles.stepInfo}>
                  <div className={styles.stepStatusCircle} data-status={step.status}>
                    {step.status === 'completed' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <div className={styles.stepMeta}>
                      <Badge variant="neutral" size="sm">
                        {STEP_TYPE_LABELS[step.step_type] || step.step_type}
                      </Badge>
                      {step.due_date && (
                        <span className={styles.stepDueDate}>
                          Due: {new Date(step.due_date).toLocaleDateString('en-IN')}
                        </span>
                      )}
                      {step.requires_response && (
                        <Badge variant="warning" size="sm">Response Required</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {step.instructions && (
                <p className={styles.stepInstructions}>{step.instructions}</p>
              )}

              {/* Responses */}
              {step.care_plan_step_responses && step.care_plan_step_responses.length > 0 && (
                <div className={styles.responsesSection}>
                  <h4 className={styles.responsesTitle}>
                    Responses ({step.care_plan_step_responses.length})
                  </h4>
                  {step.care_plan_step_responses.map((response) => (
                    <StepResponseViewer key={response.id} response={response} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Step Form */}
      {plan.status === 'active' && (
        <div className={styles.addStepSection}>
          {showAddStep ? (
            <Card>
              <CardHeader>
                <CardTitle>Add New Step</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Title *</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Step title"
                    value={newStepTitle}
                    onChange={(e) => setNewStepTitle(e.target.value)}
                  />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Type</label>
                    <select
                      className={styles.select}
                      value={newStepType}
                      onChange={(e) => setNewStepType(e.target.value as CarePlanStepType)}
                    >
                      {VALID_STEP_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {STEP_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Due Date</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={newStepDueDate}
                      onChange={(e) => setNewStepDueDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Instructions</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Detailed guidance"
                    value={newStepInstructions}
                    onChange={(e) => setNewStepInstructions(e.target.value)}
                    rows={2}
                  />
                </div>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={newStepRequiresResponse}
                    onChange={(e) => setNewStepRequiresResponse(e.target.checked)}
                  />
                  <span>Requires response</span>
                </label>
                <div className={styles.addStepActions}>
                  <Button variant="secondary" onClick={() => setShowAddStep(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleAddStep} loading={isAddingStep}>
                    Add Step
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button variant="secondary" onClick={() => setShowAddStep(true)}>
              Add Step
            </Button>
          )}
        </div>
      )}

      {/* Plan Actions */}
      <div className={styles.footer}>
        {plan.status === 'active' && (
          <>
            <Button
              variant="secondary"
              onClick={() => updatePlanStatus('completed')}
              loading={isUpdating}
            >
              Mark Completed
            </Button>
            <Button
              variant="secondary"
              onClick={() => updatePlanStatus('archived')}
              loading={isUpdating}
            >
              Archive
            </Button>
          </>
        )}
        {plan.status === 'completed' && (
          <Button
            variant="secondary"
            onClick={() => updatePlanStatus('archived')}
            loading={isUpdating}
          >
            Archive
          </Button>
        )}
      </div>
    </div>
  );
}
