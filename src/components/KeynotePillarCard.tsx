type PillarName = 'Identity' | 'Voice' | 'Purpose' | 'Resilience' | 'Clarity';

type KeynotePillarCardProps = {
  pillar: PillarName;
};

function IdentityGraphic() {
  return (
    <svg viewBox="0 0 320 150" className="h-full w-full" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.16">
        <ellipse cx="160" cy="76" rx="102" ry="62" />
        <ellipse cx="160" cy="76" rx="90" ry="54" />
        <ellipse cx="160" cy="76" rx="78" ry="46" />
        <ellipse cx="160" cy="76" rx="66" ry="38" />
        <ellipse cx="160" cy="76" rx="54" ry="30" />
        <path d="M125 78c0-22 15-38 35-38 21 0 36 16 36 38 0 15-7 28-18 35" />
        <path d="M135 80c0-16 10-27 25-27 14 0 25 11 25 27 0 11-5 20-13 25" />
        <path d="M145 81c0-9 6-16 15-16s15 7 15 16c0 7-3 12-8 15" />
      </g>
      <path
        d="M208 28c20 12 34 28 43 48"
        fill="none"
        stroke="#e85d04"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

function VoiceGraphic() {
  const bars = [10, 18, 28, 42, 58, 34, 68, 46, 76, 54, 86, 62, 90, 58, 82, 46, 74, 38, 62, 30, 48, 22, 36, 16, 26, 12];

  return (
    <svg viewBox="0 0 320 150" className="h-full w-full" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.16">
        {bars.map((height, index) => {
          const x = 30 + index * 10.4;
          return <line key={x} x1={x} x2={x} y1={75 - height / 2} y2={75 + height / 2} />;
        })}
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="1" opacity="0.09">
        <circle cx="160" cy="75" r="31" />
        <circle cx="160" cy="75" r="47" />
        <circle cx="160" cy="75" r="63" />
      </g>
      <path
        d="M199 30a58 58 0 0 1 18 24"
        fill="none"
        stroke="#e85d04"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

function PurposeGraphic() {
  return (
    <svg viewBox="0 0 320 150" className="h-full w-full" aria-hidden="true">
      <g fill="none" stroke="currentColor" opacity="0.13">
        <circle cx="160" cy="73" r="59" />
        <circle cx="160" cy="73" r="45" />
        <circle cx="160" cy="73" r="28" />
        <path d="M160 14v118M101 73h118" />
        <path d="M160 25l10 38 35 10-35 10-10 38-10-38-35-10 35-10 10-38z" />
      </g>
      <path
        d="M160 73l42-42"
        fill="none"
        stroke="#e85d04"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path d="M202 31l-5 14-9-9 14-5z" fill="#e85d04" opacity="0.85" />
      <path
        d="M133 123c18-12 43-12 49-27 4-10-3-17-12-21"
        fill="none"
        stroke="#e85d04"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        opacity="0.6"
      />
    </svg>
  );
}

function ResilienceGraphic() {
  return (
    <svg viewBox="0 0 320 150" className="h-full w-full" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.14">
        <path d="M15 58c55 0 74 7 104 34 19 17 35 22 51 22 30 0 45-39 73-53 16-8 34-10 62-10" />
        <path d="M15 66c54 0 72 6 101 31 20 18 38 24 55 24 31 0 47-42 76-56 16-8 33-10 58-10" />
        <path d="M15 74c52 0 70 5 98 28 22 18 40 26 59 26 32 0 49-45 78-59 15-8 31-10 55-10" />
        <path d="M15 82c50 0 68 4 95 25 23 18 42 27 63 27 33 0 51-47 80-61 14-7 29-9 52-9" />
      </g>
      <path
        d="M111 102c24 18 43 27 62 27 33 0 51-46 80-60"
        fill="none"
        stroke="#e85d04"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
}

function ClarityGraphic() {
  return (
    <svg viewBox="0 0 320 150" className="h-full w-full" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.13">
        <path d="M28 42l108 33L28 108" />
        <path d="M28 50l108 25L28 100" />
        <path d="M28 58l108 17L28 92" />
        <path d="M136 75l52-48 34 96-86-48z" />
        <path d="M188 27l104 14M188 36l104 25M188 48l104 38M188 60l104 50" />
      </g>
      <path
        d="M188 43l104 28"
        fill="none"
        stroke="#e85d04"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
}

const graphics: Record<PillarName, () => JSX.Element> = {
  Identity: IdentityGraphic,
  Voice: VoiceGraphic,
  Purpose: PurposeGraphic,
  Resilience: ResilienceGraphic,
  Clarity: ClarityGraphic,
};

export default function KeynotePillarCard({ pillar }: KeynotePillarCardProps) {
  const Graphic = graphics[pillar];

  return (
    <div className="group relative min-h-[118px] overflow-hidden rounded-2xl border border-navy/[0.06] bg-white shadow-[0_8px_22px_rgba(10,35,58,0.10)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(10,35,58,0.16)]">
      <div className="pointer-events-none absolute inset-0 text-brandBlue transition-transform duration-500 group-hover:scale-[1.04]">
        <Graphic />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/35 via-white/10 to-white/35" />
      <div className="relative z-10 flex min-h-[118px] items-center justify-center px-5 py-6">
        <span className="text-center text-lg font-bold text-navy md:text-[1.05rem]">{pillar}</span>
      </div>
    </div>
  );
}
