'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import styles from './PrescriptionPage.module.css';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ExistingPrescription {
  id: string;
  prescription_number: string;
  pdf_url: string | null;
  created_at: string;
}

export default function PrescriptionPage({ params }: PageProps) {
  const { id: consultationId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [existingPrescription, setExistingPrescription] = useState<ExistingPrescription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing prescription on mount
  useEffect(() => {
    const loadExistingPrescription = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('prescriptions')
          .select('id, prescription_number, pdf_url, created_at')
          .eq('consultation_id', consultationId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error loading prescription:', error);
        } else if (data) {
          setExistingPrescription(data);
        }
      } catch (error) {
        console.error('Error loading prescription:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingPrescription();
  }, [consultationId]);

  const handleGeneratePdf = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch('/api/prescriptions/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ consultationId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate prescription');
      }

      // Get the PDF blob
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

      // Reload existing prescription to get the saved record
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

      toast('Prescription generated successfully', 'success');
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
    // Prefer stored PDF URL, fall back to blob URL
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

      if (error) {
        throw new Error('Failed to complete consultation');
      }

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

  const hasPrescription = existingPrescription || pdfUrl;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href={`/consultations/${consultationId}/soap`} className={styles.backLink}>
          Back to SOAP Notes
        </Link>
        <h1 className={styles.title}>Generate Prescription</h1>
      </div>

      {/* Show existing prescription if available */}
      {existingPrescription && (
        <Card>
          <CardHeader>
            <CardTitle>Existing Prescription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.existingPrescription}>
              <p>
                <strong>Prescription Number:</strong> {existingPrescription.prescription_number}
              </p>
              <p>
                <strong>Generated:</strong>{' '}
                {new Date(existingPrescription.created_at).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
              {existingPrescription.pdf_url && (
                <div className={styles.actions}>
                  <Button
                    variant="secondary"
                    onClick={() => window.open(existingPrescription.pdf_url!, '_blank')}
                  >
                    View Prescription PDF
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {existingPrescription ? 'Regenerate Prescription' : 'Prescription PDF'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.content}>
            <p className={styles.description}>
              {existingPrescription
                ? 'You can regenerate the prescription PDF if changes were made to the SOAP notes.'
                : 'Generate a PDF prescription document based on the SOAP notes for this consultation.'}
              {!existingPrescription && ' The prescription will include:'}
            </p>

            {!existingPrescription && (
              <ul className={styles.list}>
                <li>Your credentials (name, VCI registration, qualifications)</li>
                <li>Pet and owner details</li>
                <li>Diagnosis from SOAP notes</li>
                <li>Prescribed medications with dosages and instructions</li>
                <li>Recommendations and warnings</li>
                <li>Standard teleconsultation disclaimer</li>
              </ul>
            )}

            <div className={styles.actions}>
              {isLoading ? (
                <Button variant="primary" disabled>
                  Loading...
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleGeneratePdf}
                  loading={isGenerating}
                >
                  {isGenerating
                    ? 'Generating...'
                    : existingPrescription
                    ? 'Regenerate Prescription PDF'
                    : 'Generate Prescription PDF'}
                </Button>
              )}

              {hasPrescription && (
                <Button variant="secondary" onClick={handleViewPdf}>
                  View PDF
                </Button>
              )}
            </div>

            {pdfUrl && !existingPrescription && (
              <div className={styles.successMessage}>
                <p>Prescription generated successfully!</p>
                <p className={styles.hint}>
                  The PDF has been downloaded. You can also view it or generate a new one.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className={styles.footer}>
        <Button
          variant="secondary"
          onClick={() => router.push(`/consultations/${consultationId}/soap`)}
        >
          Back to SOAP Notes
        </Button>
        <Button
          variant="primary"
          onClick={handleFinishConsultation}
          loading={isFinishing}
        >
          {isFinishing ? 'Finishing...' : 'Finish Consultation'}
        </Button>
      </div>
    </div>
  );
}
