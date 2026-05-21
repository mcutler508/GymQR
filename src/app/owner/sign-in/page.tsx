import { AuthShell } from '../_components/auth-shell';
import { SignInForm } from './SignInForm';

export default function SignInPage() {
  return (
    <AuthShell
      kicker="Welcome back"
      title="Step inside,"
      flourish="the floor is yours."
      footerPrompt="New to RepetoIQ?"
      footerHref="/owner/sign-up"
      footerLabel="Open your gym →"
    >
      <SignInForm />
    </AuthShell>
  );
}
