import React from 'react';

interface BrandMarkProps {
  className?: string;
  variant?: 'hero' | 'compact';
}

export default function BrandMark({ className = '', variant = 'hero' }: BrandMarkProps) {
  const isHero = variant === 'hero';

  return (
    <div
      className={`inline-flex flex-col items-center justify-center text-zinc-950 select-none ${className}`}
      aria-label="VOD INK"
      role="img"
    >
      <div className="flex items-center justify-center leading-none">
        <span
          className={`font-sans font-black uppercase tracking-[-0.08em] ${
            isHero ? 'text-[2.35rem] sm:text-[2.85rem]' : 'text-xl'
          }`}
        >
          VOD
        </span>
        <span
          aria-hidden="true"
          className={`bg-zinc-950 shrink-0 ${
            isHero ? 'mx-3 h-8 sm:h-10 w-[2px]' : 'mx-2 h-5 w-px'
          }`}
        />
        <span
          className={`font-sans font-black uppercase tracking-[-0.08em] ${
            isHero ? 'text-[2.35rem] sm:text-[2.85rem]' : 'text-xl'
          }`}
        >
          INK
        </span>
      </div>

      <div
        aria-hidden="true"
        className={`bg-zinc-950 ${isHero ? 'mt-2 h-px w-full' : 'mt-1 h-px w-full'}`}
      />

      <span
        className={`font-mono font-bold uppercase text-zinc-500 ${
          isHero
            ? 'mt-2 text-[8px] sm:text-[9px] tracking-[0.28em]'
            : 'mt-1 text-[7px] tracking-[0.2em]'
        }`}
      >
        Tattoo Studio · Santander
      </span>
    </div>
  );
}
