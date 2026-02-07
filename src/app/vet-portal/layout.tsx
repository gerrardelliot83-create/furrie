import { VetLayout } from '@/components/layouts/VetLayout';

export default function VetRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VetLayout>{children}</VetLayout>;
}
