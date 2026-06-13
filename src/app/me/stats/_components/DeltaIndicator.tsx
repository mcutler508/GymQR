type Direction = 'up' | 'down' | 'flat';
type Tone = 'positive' | 'neutral';

export type Delta = {
  value: string;
  direction: Direction;
  descriptor?: string;
  tone?: Tone;
};

const GLYPH: Record<Direction, string> = {
  up: '↑',
  down: '↓',
  flat: '·',
};

export function DeltaIndicator({ value, direction, descriptor, tone = 'positive' }: Delta) {
  const colorClass =
    tone === 'positive' && direction !== 'flat' ? 'text-accent' : 'text-muted-strong';
  return (
    <p className="mt-1.5 text-[11px] font-mono tabular-nums leading-tight text-muted">
      <span className={`${colorClass} font-medium`}>
        {GLYPH[direction]} {value}
      </span>
      {descriptor && <span className="ml-1.5 text-muted">{descriptor}</span>}
    </p>
  );
}
