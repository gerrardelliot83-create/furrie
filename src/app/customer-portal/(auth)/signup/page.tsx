import { redirect } from 'next/navigation';

// Signup is now handled by the unified auth flow at /login
// Redirect all signup traffic to login, preserving query params like invite codes
export default async function CustomerSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const invite = params.invite;

  if (invite) {
    redirect(`/login?invite=${encodeURIComponent(invite)}`);
  }

  redirect('/login');
}
