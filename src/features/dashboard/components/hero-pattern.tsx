export function HeroPattern() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
      {/* Top right violet glow */}
      <div className="absolute top-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-primary/15 blur-[120px]" />
      {/* Center left subtle glow */}
      <div className="absolute top-[30%] left-[-8%] h-[400px] w-[400px] rounded-full bg-primary/8 blur-[100px]" />
      {/* Bottom center very subtle */}
      <div className="absolute bottom-[-5%] left-[35%] h-[300px] w-[300px] rounded-full bg-primary/5 blur-[80px]" />
    </div>
  );
}