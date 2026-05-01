import { AuthShell } from '../_components/auth-shell';
import { SignInForm } from './SignInForm';

export default function SignInPage() {
  return (
    <AuthShell
      kicker="Welcome back"
      title="Step inside,"
      flourish="the floor is yours."
      lede="Central command for the gym you built — every scan, every set, every member, all in one quiet place."
      footerPrompt="New to RepTag?"
      footerHref="/owner/sign-up"
      footerLabel="Open your gym →"
    >
      <SignInForm />
    </AuthShell>
  );
}
