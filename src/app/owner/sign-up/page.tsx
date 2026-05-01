import { AuthShell } from '../_components/auth-shell';
import { SignUpForm } from './SignUpForm';

export default function SignUpPage() {
  return (
    <AuthShell
      kicker="Open your gym"
      title="Name it,"
      flourish="and we'll remember every rep."
      lede="One account. One gym. A printable QR for every machine, and a quiet record of every member who ever set foot through the door."
      footerPrompt="Already have a gym?"
      footerHref="/owner/sign-in"
      footerLabel="Sign in →"
    >
      <SignUpForm />
    </AuthShell>
  );
}
