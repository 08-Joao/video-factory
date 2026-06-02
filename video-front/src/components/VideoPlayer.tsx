import { fileUrl } from "@/lib/api";

export function VideoPlayer({ filePath, poster, vertical = false }: { filePath: string; poster?: string; vertical?: boolean }) {
  return (
    <video
      controls
      preload="metadata"
      poster={poster ? fileUrl(poster) : undefined}
      src={fileUrl(filePath)}
      style={{ width: "100%", aspectRatio: vertical ? "9 / 16" : "16 / 9", objectFit: "cover", background: "#0f1216" }}
    />
  );
}
