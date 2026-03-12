import { VetLayout } from '@/components/layouts/VetLayout';

export default function VetAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VetLayout>{children}</VetLayout>;
}
