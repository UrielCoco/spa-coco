import React from "react";
import { useToolDebug } from "@/store/toolDebug.store";

export default function ToolDebugPane() {
  const { lastToolRaw, lastToolParsed, clear } = useToolDebug();

  if (!lastToolRaw && !lastToolParsed) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        bottom: 8,
        width: "32%",
        background: "#0b0b0b",
        color: "#e6e6e6",
        borderRadius: 12,
        padding: 12,
        overflow: "auto",
        boxShadow: "0 8px 24px rgba(0,0,0,.25)",
        zIndex: 50,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong>JSON de tool (debug)</strong>
        <button
          onClick={clear}
          style={{
            background: "#222",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 8,
            padding: "4px 8px",
            cursor: "pointer",
          }}
        >
          Cerrar
        </button>
      </div>

      {lastToolRaw ? (
        <>
          <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 4 }}>crudo</div>
          <pre style={{ whiteSpace: "pre-wrap" }}>{lastToolRaw}</pre>
        </>
      ) : null}

      {lastToolParsed ? (
        <>
          <div style={{ opacity: 0.7, fontSize: 12, margin: "12px 0 4px" }}>parseado</div>
          <pre>{JSON.stringify(lastToolParsed, null, 2)}</pre>
        </>
      ) : null}
    </div>
  );
}
