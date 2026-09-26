import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { countCompletedConsultations } from '@/app/api/vet/_lib/consultationCounts';
import { VetsManagement } from './VetsManagement';

export const maxDuration = 15;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nav');
  return {
    title: `Admin ${t('vets')}`,
  };
}

export default async function AdminVetsPage() {
  const supabase = await createClient();

  const { data: vets } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      is_active,
      created_at,
      vet_profiles (
        qualifications,
        vci_registration_number,
        specializations,
        years_of_experience,
        is_verified,
        is_available,
        availability_schedule,
        consultation_count,
        average_rating
      )
    `)
    .eq('role', 'vet')
    .order('created_at', { ascending: false });

  // Completed consultations per vet, counted (consultation_count is never incremented)
  const counts = await countCompletedConsultations((vets || []).map((v) => v.id));
  const vetsWithCounts = (vets || []).map((v) => ({ ...v, completed_consultations: counts.get(v.id) ?? 0 }));

  return <VetsManagement initialVets={vetsWithCounts} />;
}
