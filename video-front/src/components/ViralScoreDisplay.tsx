export function ViralScoreDisplay({ score }: { score?: number }) {
  const value = Math.max(0, Math.min(10, score || 0));
  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <strong>{value.toFixed(1)}</strong>
        <span className="muted">/ 10</span>
      </div>
      <div className="score"><span style={{ width: `${value * 10}%` }} /></div>
    </div>
  );
}
