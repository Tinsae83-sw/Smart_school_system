import { ImageResponse } from "next/og";

export const alt = "SmartSchool — Intelligent School Management Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #2563eb 0%, #3730a3 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 40, fontWeight: 800, marginBottom: 24 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            🎓
          </div>
          <span>SmartSchool</span>
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, maxWidth: 900 }}>
          Intelligent School Management for Everyone
        </div>
        <div style={{ fontSize: 28, opacity: 0.85, marginTop: 24, maxWidth: 800, lineHeight: 1.5 }}>
          Attendance, grades, assignments, messaging, and reporting — connecting
          administrators, teachers, students, and parents in one platform.
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}