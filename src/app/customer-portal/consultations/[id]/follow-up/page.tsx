import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/Card';
import { ChatInterface } from '@/components/consultation/ChatInterface';

export const metadata: Metadata = {
  title: 'Follow-up Chat - Furrie',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerFollowUpPage({ params }: PageProps) {
  const { id: consultationId } = await params;
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/customer-portal/login');
  }

  // Fetch consultation with relations
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
      profiles!consultations_vet_id_fkey (
        id,
        full_name
      ),
      vet_profiles!consultations_vet_id_fkey (
        qualifications
      )
    `)
    .eq('id', consultationId)
    .eq('customer_id', user.id)
    .single();

  if (consultationError || !consultation) {
    notFound();
  }

  const pet = consultation.pets;
  const vet = consultation.profiles;

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
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600 }}>
          Follow-up Chat
        </h1>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          Chat with your vet about {pet?.name || 'your pet'}
        </p>
      </div>

      {/* Vet info card */}
      {vet && (
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
                color: 'var(--color-primary)',
              }}>
                V
              </div>
              <div>
                <p style={{ fontWeight: 600 }}>Dr. {vet.full_name || 'Veterinarian'}</p>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  {consultation.vet_profiles?.qualifications || 'Licensed Veterinarian'}
                </p>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                  Pet
                </p>
                <p style={{ fontSize: 'var(--font-size-sm)' }}>
                  {pet?.name} ({pet?.species === 'dog' ? 'Dog' : 'Cat'})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Interface */}
      <ChatInterface
        consultationId={consultationId}
        currentUserId={user.id}
        currentUserRole="customer"
      />
    </div>
  );
}
