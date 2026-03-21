import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function PatientsLoading() {
  return <TableSkeleton rows={6} />;
}
