import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/Card';
import { ChatInterface } from '@/components/consultation/ChatInterface';

export const metadata: Metadata = {
  title: 'Follow-up Chat - Vet Portal',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VetFollowUpPage({ params }: PageProps) {
  const { id: consultationId } = await params;
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/vet-portal/login');
  }

  // Verify user is a vet
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'vet') {
    redirect('/vet-portal/login?error=wrong_account');
  }

  // Fetch consultation with pet details
  const { data: consultation, error: consultationError } = await supabase
    .from('consultations')
    .select(`
      *,
      pets!consultations_pet_id_fkey (
        id,
        name,
        species,
        breed
      ),
      profiles!consultations_customer_id_fkey (
        id,
        full_name
      )
    `)
    .eq('id', consultationId)
    .eq('vet_id', user.id)
    .single();

  if (consultationError || !consultation) {
    notFound();
  }

  const pet = consultation.pets;
  const customer = consultation.profiles;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div>
        <Link
          href={`/consultations/${consultationId}`}
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-link)',
            marginBottom: 'var(--space-2)',
            display: 'inline-block',
          }}
        >
          Back to Consultation
        </Link>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600 }}>
          Follow-up Chat
        </h1>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          Chat with {customer?.full_name || 'the pet parent'} about {pet?.name || 'their pet'}
        </p>
      </div>

      {/* Consultation context card */}
      <Card>
        <CardContent>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--font-size-lg)',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
            }}>
              {pet?.species === 'dog' ? 'D' : 'C'}
            </div>
            <div>
              <p style={{ fontWeight: 600 }}>{pet?.name || 'Unknown Pet'}</p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {pet?.breed || 'Unknown breed'} | Owner: {customer?.full_name || 'Unknown'}
              </p>
            </div>
            {consultation.concern_text && (
              <div style={{ marginLeft: 'auto', maxWidth: '300px' }}>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                  Original Concern
                </p>
                <p style={{ fontSize: 'var(--font-size-sm)' }}>
                  {consultation.concern_text}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <ChatInterface
        consultationId={consultationId}
        currentUserId={user.id}
        currentUserRole="vet"
      />
    </div>
  );
}
