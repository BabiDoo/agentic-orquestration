export function renderHumanLoadingHtml(): string {
  return `
    <main class="relative flex min-h-full items-center justify-center overflow-hidden bg-[var(--md-sys-color-surface-container-lowest,#f7f8fc)] px-6 py-12 font-['Inter'] text-[var(--md-sys-color-on-surface,#172033)]">
      <style>
        @keyframes md3-float-slow {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(12px, -10px, 0) scale(1.04); }
        }
        @keyframes md3-float-reverse {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-14px, 10px, 0) scale(.96); }
        }
        @keyframes md3-breathe {
          0%, 100% { transform: scale(.94); opacity: .72; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes md3-linear-indeterminate {
          0% { left: -40%; width: 35%; }
          50% { left: 30%; width: 60%; }
          100% { left: 100%; width: 40%; }
        }
        @keyframes md3-dot-pulse {
          0%, 70%, 100% { transform: translateY(0); opacity: .38; }
          35% { transform: translateY(-3px); opacity: 1; }
        }
        .loading-shimmer { animation: md3-linear-indeterminate 2.2s cubic-bezier(0.2, 0, 0, 1) infinite; }
        .loading-breathe { animation: md3-breathe 3.4s cubic-bezier(0.2, 0, 0, 1) infinite; }
        .loading-float-slow { animation: md3-float-slow 8s ease-in-out infinite; }
        .loading-float-reverse { animation: md3-float-reverse 9s ease-in-out infinite; }
        .loading-dot:nth-child(2) { animation-delay: .15s; }
        .loading-dot:nth-child(3) { animation-delay: .3s; }
      </style>

      <div class="pointer-events-none absolute -left-20 top-[-140px] h-[360px] w-[360px] rounded-full bg-[var(--md-sys-color-primary-container,#dfe4ff)] opacity-70 blur-3xl loading-float-slow"></div>
      <div class="pointer-events-none absolute -bottom-40 -right-24 h-[420px] w-[420px] rounded-full bg-[var(--md-sys-color-secondary-container,#e8ddff)] opacity-60 blur-3xl loading-float-reverse"></div>

      <section class="relative w-full max-w-[590px] overflow-hidden rounded-[28px] border border-white/90 bg-white/90 px-5 py-7 shadow-[0_24px_70px_rgba(41,74,145,0.12)] backdrop-blur-xl sm:px-9 sm:py-8" aria-live="polite">
        <div class="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#f5f7ff_0%,#faf8ff_100%)] px-5 py-7 sm:px-7 sm:py-8">
          <div class="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[var(--md-sys-color-primary-container,#dfe5ff)]/70 blur-2xl"></div>
          <div class="relative flex flex-col items-center text-center">
            <div class="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_7px_20px_rgba(41,74,145,0.14)]">
              <div class="absolute h-9 w-9 rounded-full bg-[var(--md-sys-color-primary-container,#dfe4ff)] loading-breathe"></div>
              <div class="relative flex items-center gap-[3px]">
                <span class="loading-dot h-1.5 w-1.5 rounded-full bg-[#294a91]" style="animation: md3-dot-pulse 1.2s ease-in-out infinite"></span>
                <span class="loading-dot h-1.5 w-1.5 rounded-full bg-[#5962be]" style="animation: md3-dot-pulse 1.2s ease-in-out infinite"></span>
                <span class="loading-dot h-1.5 w-1.5 rounded-full bg-[#7b70dd]" style="animation: md3-dot-pulse 1.2s ease-in-out infinite"></span>
              </div>
            </div>
            <div class="mt-5">
              <h1 class="text-[19px] font-semibold tracking-[-0.025em] text-[#1b2540] sm:text-[21px]">
                Estou pensando
              </h1>
              <p class="mt-1.5 text-xs font-mono text-[#64748b]">
                Executando passos de raciocínio e verificações determinísticas...
              </p>
            </div>
          </div>
          <div class="relative mt-7 h-1.5 overflow-hidden rounded-full bg-[var(--md-sys-color-surface-container-high,#e2e8f0)]">
            <div class="loading-shimmer absolute h-full rounded-full bg-[linear-gradient(90deg,var(--md-sys-color-primary,#294a91),var(--md-sys-color-secondary,#f68934))]"></div>
          </div>
        </div>
      </section>
    </main>
  `;
}
