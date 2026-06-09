import { ImageResponse } from "next/og";
import { getRitual, allRitualSlugs, ritualFaith, FAITH_LABELS } from "@/lib/pandit-kb";

export const alt = "Indian wedding ritual — The Indian Aisle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return allRitualSlugs().map((slug) => ({ slug }));
}

export default function Image({ params }: { params: { slug: string } }) {
  const r = getRitual(params.slug);
  const title = r?.title ?? "Indian Wedding Rituals";
  const faith = r ? FAITH_LABELS[ritualFaith(r)] : "";
  const summary = r?.summary ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#faf6ef",
          padding: "72px",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", fontSize: 44 }}>🪔</div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#b08d57",
            }}
          >
            Digital Pandit
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 30, color: "#b08d57", marginBottom: 8 }}>
            {faith ? `${faith} wedding ritual` : ""}
          </div>
          <div style={{ display: "flex", fontSize: 84, color: "#2b2620", lineHeight: 1.05 }}>
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              color: "#5c5448",
              marginTop: 20,
              maxWidth: 980,
            }}
          >
            {summary}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "#5c5448" }}>
          The Indian Aisle · indianaisle.com
        </div>
      </div>
    ),
    { ...size },
  );
}
