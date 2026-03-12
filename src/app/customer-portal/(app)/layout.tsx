import { CustomerLayout } from '@/components/layouts/CustomerLayout';

export default function CustomerAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerLayout>{children}</CustomerLayout>;
}
