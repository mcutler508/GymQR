import { AuthShell } from '../_components/auth-shell';
import { ResetPasswordForm } from './ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <AuthShell
      kicker="Fresh start"
      title="New password,"
      flourish="same gym."
      formKicker="Returning owner"
      formTitle="Choose a new password"
      footerPrompt="Link not working?"
      footerHref="/owner/forgot-password"
      footerLabel="Send a new one →"
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
