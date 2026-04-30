import { NewEquipmentForm } from './NewEquipmentForm';

export default function NewEquipmentPage() {
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">Add equipment</h1>
      <p className="mt-2 text-sm text-neutral-400">
        We&apos;ll generate a unique QR slug. After saving, you&apos;ll land on the print page.
      </p>
      <div className="mt-8">
        <NewEquipmentForm />
      </div>
    </div>
  );
}
