import { AdminLayout } from '@/components/layouts/AdminLayout';

export default function AdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
