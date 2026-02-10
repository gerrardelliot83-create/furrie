'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import styles from './PrescriptionPage.module.css';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PrescriptionPage({ params }: PageProps) {
  const { id: consultationId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

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
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href={`/vet-portal/consultations/${consultationId}/soap`} className={styles.backLink}>
          Back to SOAP Notes
        </Link>
        <h1 className={styles.title}>Generate Prescription</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prescription PDF</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.content}>
            <p className={styles.description}>
              Generate a PDF prescription document based on the SOAP notes for this consultation.
              The prescription will include:
            </p>

            <ul className={styles.list}>
              <li>Your credentials (name, VCI registration, qualifications)</li>
              <li>Pet and owner details</li>
              <li>Diagnosis from SOAP notes</li>
              <li>Prescribed medications with dosages and instructions</li>
              <li>Recommendations and warnings</li>
              <li>Standard teleconsultation disclaimer</li>
            </ul>

            <div className={styles.actions}>
              <Button
                variant="primary"
                onClick={handleGeneratePdf}
                loading={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate Prescription PDF'}
              </Button>

              {pdfUrl && (
                <Button variant="secondary" onClick={handleViewPdf}>
                  View PDF
                </Button>
              )}
            </div>

            {pdfUrl && (
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
          onClick={() => router.push(`/vet-portal/consultations/${consultationId}/soap`)}
        >
          Back to SOAP Notes
        </Button>
        <Button
          variant="primary"
          onClick={() => router.push('/vet-portal/consultations')}
        >
          Finish Consultation
        </Button>
      </div>
    </div>
  );
}
