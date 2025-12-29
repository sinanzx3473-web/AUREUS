export const LiveTicker = () => {
  const verifications = [
    { address: "0x71...A2", skill: "RUST", score: 98 },
    { address: "0x33...B1", skill: "REACT", score: 100 },
    { address: "0x99...C4", skill: "SOLIDITY", score: 95 },
    { address: "0x42...D8", skill: "PYTHON", score: 97 },
    { address: "0x88...E3", skill: "TYPESCRIPT", score: 99 },
  ];

  const tickerContent = verifications
    .map((v) => `⚡ ${v.address} verified ${v.skill} [${v.score}%]`)
    .join(" • ");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-md border-t border-white/10 h-10 overflow-hidden">
      <div className="flex items-center h-full">
        <div className="animate-marquee whitespace-nowrap">
          <span className="font-mono text-xs tracking-widest uppercase text-primary/80">
            LATEST VERIFICATIONS: {tickerContent} • {tickerContent}
          </span>
        </div>
      </div>
    </div>
  );
};
