import { redirect } from 'next/navigation';

// Signup is now handled by the unified auth flow at /login
// Redirect all signup traffic to login
export default function CustomerSignupPage() {
  redirect('/login');
}
