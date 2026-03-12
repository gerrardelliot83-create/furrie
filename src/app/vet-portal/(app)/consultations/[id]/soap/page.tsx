import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VetSoapNotesPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/consultations/${id}?tab=soap`);
}
