export function CRTOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {/* Scanlines */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.8) 2px, rgba(0,0,0,0.8) 4px)',
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.7) 100%)',
        }}
      />
      {/* Corner glow */}
      <div className="absolute inset-0 opacity-5"
        style={{
          background: 'linear-gradient(135deg, #bf00ff 0%, transparent 50%, #00ffff 100%)',
        }}
      />
    </div>
  );
}
