import { ListSkeleton } from '@/components/ui/LoadingSkeleton';

export default function TasksLoading() {
  return <ListSkeleton count={4} wide />;
}
