const colors: Record<string, string> = {
  PUBLISHED: "var(--good)",
  READY_TO_PUBLISH: "var(--good)",
  FAILED: "var(--bad)",
  SCRIPT_REJECTED: "var(--bad)",
  SCRIPT_GENERATED: "var(--warn)",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className="badge" style={{ border: `1px solid ${colors[status] || "var(--line)"}` }}>{status}</span>;
}
