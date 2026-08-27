export function renderHumanLoadingHtml(): string {
  return `
    <main class="relative flex min-h-full items-center justify-center overflow-hidden bg-[#f7f8fc] px-6 py-12 font-['Inter'] text-[#172033]">
      <style>
        @keyframes float-slow {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(12px, -10px, 0) scale(1.04); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-14px, 10px, 0) scale(.96); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(.94); opacity: .72; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-120%); }
          55%, 100% { transform: translateX(260%); }
        }
        @keyframes dot-pulse {
          0%, 70%, 100% { transform: translateY(0); opacity: .38; }
          35% { transform: translateY(-3px); opacity: 1; }
        }
        .loading-shimmer { animation: shimmer 2.8s cubic-bezier(.4,0,.2,1) infinite; }
        .loading-breathe { animation: breathe 3.8s ease-in-out infinite; }
        .loading-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .loading-float-reverse { animation: float-reverse 9s ease-in-out infinite; }
        .loading-dot:nth-child(2) { animation-delay: .15s; }
        .loading-dot:nth-child(3) { animation-delay: .3s; }
      </style>

      <div class="pointer-events-none absolute -left-20 top-[-140px] h-[360px] w-[360px] rounded-full bg-[#dfe4ff] opacity-70 blur-3xl loading-float-slow"></div>
      <div class="pointer-events-none absolute -bottom-40 -right-24 h-[420px] w-[420px] rounded-full bg-[#e8ddff] opacity-60 blur-3xl loading-float-reverse"></div>

      <section class="relative w-full max-w-[590px] overflow-hidden rounded-[28px] border border-white/90 bg-white/85 px-5 py-7 shadow-[0_24px_70px_rgba(41,74,145,0.12)] backdrop-blur-xl sm:px-9 sm:py-8" aria-live="polite">
        <div class="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#f5f7ff_0%,#faf8ff_100%)] px-5 py-7 sm:px-7 sm:py-8">
          <div class="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#dfe5ff]/70 blur-2xl"></div>
          <div class="relative flex flex-col items-center text-center">
            <div class="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_7px_20px_rgba(41,74,145,0.14)]">
              <div class="absolute h-9 w-9 rounded-full bg-[#dfe4ff] loading-breathe"></div>
              <div class="relative flex items-center gap-[3px]">
                <span class="loading-dot h-1.5 w-1.5 rounded-full bg-[#294a91]" style="animation: dot-pulse 1.2s ease-in-out infinite"></span>
                <span class="loading-dot h-1.5 w-1.5 rounded-full bg-[#5962be]" style="animation: dot-pulse 1.2s ease-in-out infinite"></span>
                <span class="loading-dot h-1.5 w-1.5 rounded-full bg-[#7b70dd]" style="animation: dot-pulse 1.2s ease-in-out infinite"></span>
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
          <div class="relative mt-7 h-1 overflow-hidden rounded-full bg-white/80">
            <div class="loading-shimmer absolute h-full w-1/3 rounded-full bg-[linear-gradient(90deg,transparent,#294a91,transparent)]"></div>
          </div>
        </div>
      </section>
    </main>
  `;
}
