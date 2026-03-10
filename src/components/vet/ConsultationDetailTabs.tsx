'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { SOAPForm } from './SOAPForm';
import type { SoapNote } from '@/types';
import styles from './ConsultationDetailTabs.module.css';

type TabKey = 'overview' | 'soap' | 'rx';

interface ExistingPrescription {
  id: string;
  prescription_number: string;
  pdf_url: string | null;
  created_at: string;
}

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

  // Prescription state
  const [existingPrescription, setExistingPrescription] = useState<ExistingPrescription | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isRxLoading, setIsRxLoading] = useState(true);
  const [hasSoapNotes, setHasSoapNotes] = useState(initialHasSoapNotes);
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted);

  // Load prescription data when Rx tab is first shown
  useEffect(() => {
    const loadPrescriptionData = async () => {
      try {
        const supabase = createClient();
        const [prescriptionResult, soapResult] = await Promise.all([
          supabase
            .from('prescriptions')
            .select('id, prescription_number, pdf_url, created_at')
            .eq('consultation_id', consultationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('soap_notes')
            .select('id')
            .eq('consultation_id', consultationId)
            .limit(1)
            .maybeSingle(),
        ]);

        if (prescriptionResult.data) {
          setExistingPrescription(prescriptionResult.data);
        }
        if (soapResult.data) {
          setHasSoapNotes(true);
        }
      } catch (error) {
        console.error('Error loading prescription data:', error);
      } finally {
        setIsRxLoading(false);
      }
    };

    loadPrescriptionData();
  }, [consultationId]);

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    // Update URL without full navigation
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  }, []);

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/prescriptions/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate prescription');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `prescription-${consultationId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Reload existing prescription record
      const supabase = createClient();
      const { data } = await supabase
        .from('prescriptions')
        .select('id, prescription_number, pdf_url, created_at')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setExistingPrescription(data);
      }

      toast('Prescription generated and emailed to customer', 'success');
    } catch (error) {
      console.error('Error generating prescription:', error);
      toast(
        error instanceof Error ? error.message : 'Failed to generate prescription',
        'error'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewPdf = () => {
    const urlToOpen = existingPrescription?.pdf_url || pdfUrl;
    if (urlToOpen) {
      window.open(urlToOpen, '_blank');
    }
  };

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
    { key: 'rx', label: 'Prescription' },
  ];

  const hasPrescriptionData = existingPrescription || pdfUrl;

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
            {tab.key === 'soap' && hasSoapNotes && (
              <span className={styles.tabDot} />
            )}
            {tab.key === 'rx' && existingPrescription && (
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
          {/* Existing Prescription */}
          {existingPrescription && (
            <div className={styles.rxCard}>
              <h3 className={styles.rxCardTitle}>Existing Prescription</h3>
              <div className={styles.rxDetails}>
                <div className={styles.rxDetail}>
                  <span className={styles.rxLabel}>Number</span>
                  <span className={styles.rxValue}>{existingPrescription.prescription_number}</span>
                </div>
                <div className={styles.rxDetail}>
                  <span className={styles.rxLabel}>Generated</span>
                  <span className={styles.rxValue} suppressHydrationWarning>
                    {new Date(existingPrescription.created_at).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              </div>
              {existingPrescription.pdf_url && (
                <Button
                  variant="secondary"
                  onClick={() => window.open(existingPrescription.pdf_url!, '_blank')}
                >
                  View Prescription PDF
                </Button>
              )}
            </div>
          )}

          {/* Generate Section */}
          <div className={styles.rxCard}>
            <h3 className={styles.rxCardTitle}>
              {existingPrescription ? 'Regenerate Prescription' : 'Generate Prescription'}
            </h3>
            <p className={styles.rxDescription}>
              {existingPrescription
                ? 'Regenerate the prescription PDF if changes were made to the SOAP notes.'
                : 'Generate a PDF prescription based on the SOAP notes. Includes vet credentials, diagnosis, medications, and recommendations.'}
            </p>

            {!hasSoapNotes && !isRxLoading && (
              <p className={styles.rxWarning}>
                Please complete SOAP notes first before generating a prescription.
              </p>
            )}

            <div className={styles.rxActions}>
              {isRxLoading ? (
                <Button variant="primary" disabled>Loading...</Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleGeneratePdf}
                  loading={isGenerating}
                  disabled={!hasSoapNotes}
                >
                  {isGenerating
                    ? 'Generating...'
                    : existingPrescription
                      ? 'Regenerate PDF'
                      : 'Generate Prescription PDF'}
                </Button>
              )}
              {hasPrescriptionData && (
                <Button variant="secondary" onClick={handleViewPdf}>
                  View PDF
                </Button>
              )}
            </div>
          </div>

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
