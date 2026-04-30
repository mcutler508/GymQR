// Section-level layout for /owner/*. Doesn't gate auth — that's done in
// (app)/layout.tsx so sign-in / sign-up remain reachable while signed-out.
export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
