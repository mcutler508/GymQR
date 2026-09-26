import { AuthShell } from '../_components/auth-shell';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const { expired } = await searchParams;
  return (
    <AuthShell
      kicker="Locked out"
      title="Happens to"
      flourish="the best of us."
      formKicker="Returning owner"
      formTitle="Reset password"
      footerPrompt="Remembered it?"
      footerHref="/owner/sign-in"
      footerLabel="Back to sign in →"
    >
      <ForgotPasswordForm expired={expired === '1'} />
    </AuthShell>
  );
}
