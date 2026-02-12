import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { EditConcernForm } from '@/components/customer/EditConcernForm';
import styles from '../ConsultationDetail.module.css';

interface EditConcernPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditConcernPage({ params }: EditConcernPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data, error } = await supabase
    .from('consultations')
    .select('id, status, concern_text, symptom_categories, customer_id')
    .eq('id', id)
    .eq('customer_id', user.id)
    .single();

  if (error || !data) notFound();

  // Only allow editing when scheduled
  if (data.status !== 'scheduled') {
    redirect(`/consultations/${id}`);
  }

  return (
    <div className={styles.container}>
      <Link href={`/consultations/${id}`} className={styles.backLink}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Consultation
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>Edit Concerns & Symptoms</h1>
      </header>

      <section className={styles.card}>
        <EditConcernForm
          consultationId={id}
          initialConcern={data.concern_text || ''}
          initialSymptoms={data.symptom_categories || []}
        />
      </section>
    </div>
  );
}
