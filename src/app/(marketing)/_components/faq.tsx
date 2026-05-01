const QUESTIONS = [
  {
    q: 'Do my members need to install an app?',
    a: 'No. The QR opens a web page that works on any phone — same flow as scanning a restaurant menu. They set a 4-digit passcode the first time and they’re in.',
  },
  {
    q: 'Do I need to buy hardware or screens?',
    a: 'No. RepTag prints to a standard label sheet from any inkjet. The phone in the member’s pocket is the entire interface.',
  },
  {
    q: 'Can owners see individual members’ lifts?',
    a: 'No. Owners see aggregate scan and set counts, plus equipment usage. Individual lift history is private to each member by design.',
  },
  {
    q: 'What about gyms with bad wifi?',
    a: 'Members use cellular by default — the QR resolves to a public URL. The page is small (under 50KB on first paint) and loads on any 4G signal.',
  },
  {
    q: 'How long does it take to roll out?',
    a: 'About fifteen minutes. Create a gym account, add your equipment, print the stickers, stick them on. There is no install, no training, no migration.',
  },
];

export function Faq() {
  return (
    <section className="relative mx-auto max-w-4xl px-6 py-24 md:py-32">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          FAQ
        </div>
        <h2 className="mt-3 font-display text-4xl leading-tight md:text-6xl">
          Asked and answered.
        </h2>
      </header>

      <div className="mt-12 divide-y divide-line/60 border-y border-line/60">
        {QUESTIONS.map((row) => (
          <details key={row.q} className="group py-6">
            <summary className="flex cursor-pointer items-center justify-between gap-6 list-none">
              <span className="font-display text-xl text-ink md:text-2xl">{row.q}</span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line/70 text-muted-strong transition-transform group-open:rotate-45 group-open:border-accent/60 group-open:text-accent">
                +
              </span>
            </summary>
            <p className="mt-4 max-w-2xl text-muted-strong">{row.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
