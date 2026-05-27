import { NewEquipmentForm } from './NewEquipmentForm';

export default async function NewEquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; requestId?: string }>;
}) {
  const params = await searchParams;
  const prefillName = (params.name ?? '').slice(0, 80);
  const requestId = params.requestId ?? null;

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">Add equipment</h1>
      <p className="mt-2 text-sm text-neutral-400">
        {requestId
          ? 'Approving a member request — saving creates the machine and clears the request.'
          : "We'll generate a unique QR slug. After saving, you'll land on the print page."}
      </p>
      <div className="mt-8">
        <NewEquipmentForm prefillName={prefillName} requestId={requestId} />
      </div>
    </div>
  );
}
