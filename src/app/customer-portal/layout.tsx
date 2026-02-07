import { CustomerLayout } from '@/components/layouts/CustomerLayout';

export default function CustomerRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerLayout>{children}</CustomerLayout>;
}
