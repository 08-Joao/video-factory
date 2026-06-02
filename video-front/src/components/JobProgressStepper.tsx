const steps = [
  ["PENDING_SCRIPT", "Roteiro"],
  ["SCRIPT_APPROVED", "Aprovação"],
  ["TRANSLATING", "Tradução"],
  ["AUDIO_GENERATING", "Áudio"],
  ["THUMBNAIL_GENERATING", "Thumbnail"],
  ["VIDEO_EDITING", "Vídeo"],
  ["READY_TO_PUBLISH", "Pronto"],
  ["PUBLISHED", "Publicado"],
];

export function JobProgressStepper({ status }: { status: string }) {
  const current = Math.max(0, steps.findIndex(([key]) => key === status));
  return (
    <div className="steps">
      {steps.map(([key, label], index) => (
        <div className={`step ${index <= current ? "active" : ""}`} key={key}>{label}</div>
      ))}
    </div>
  );
}
