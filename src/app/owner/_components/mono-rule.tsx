type Props = {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
};

/** Section divider: monospace caps label with hairline rule running across. */
export function MonoRule({ children, align = 'left' }: Props) {
  return (
    <div className="flex items-center gap-4 text-zinc-500">
      {align !== 'left' && <span className="h-px flex-1 bg-white/10" />}
      <span className="font-mono text-[10px] uppercase tracking-[0.28em]">{children}</span>
      {align !== 'right' && <span className="h-px flex-1 bg-white/10" />}
    </div>
  );
}
