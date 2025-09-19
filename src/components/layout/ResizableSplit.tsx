"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  /** Panel izquierdo */
  left: React.ReactNode;
  /** Panel derecho */
  right: React.ReactNode;
  /** Proporción inicial (0.2–0.8) del panel izquierdo en desktop */
  defaultRatio?: number;
  /** Clave de storage para persistir el tamaño (si usas varias instancias, cambia la clave) */
  storageKey?: string;
  /** Mínimo y máximo permitidos (en proporción 0–1) */
  min?: number;
  max?: number;
  /** Alto/Clase del contenedor raíz (útil cuando no estás en un layout 100% alto) */
  className?: string;
};

/** Divisor arrastrable horizontal (izquierda/derecha) */
export default function ResizableSplit({
  left,
  right,
  defaultRatio = 0.4,
  storageKey = "ui:split:ratio",
  min = 0.2,
  max = 0.8,
  className = "h-full w-full",
}: Props) {
  // SSR-safe: lee localStorage solo en cliente
  const [ratio, setRatio] = useState<number>(() => defaultRatio);
  const draggingRef = useRef(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(storageKey);
        const n = raw ? Number(raw) : defaultRatio;
        const clamped = Number.isFinite(n)
          ? Math.min(max, Math.max(min, n))
          : defaultRatio;
        setRatio(clamped);
      }
    } catch {
      // ignorar lectura fallida de storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const w = window.innerWidth;
      const next = Math.min(max, Math.max(min, e.clientX / w));
      setRatio(next);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      try {
        window.localStorage.setItem(storageKey, String(ratio));
      } catch {
        /* noop */
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [ratio, storageKey, min, max]);

  return (
    <div className={`${className} flex`}>
      {/* Left */}
      <div className="hidden md:block min-w-[200px]" style={{ width: `${ratio * 100}%` }}>
        {left}
      </div>

      {/* Divider */}
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={() => (draggingRef.current = true)}
        className="relative w-2 cursor-col-resize group select-none"
        title="Arrastra para redimensionar"
      >
        {/* sombra suave (no dorado) */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_12px_rgba(0,0,0,.25)]" />
        {/* handle visible */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-1 rounded-full bg-black/20 group-hover:bg-black/30" />
      </div>

      {/* Right */}
      <div className="flex-1 min-w-0">{right}</div>
    </div>
  );
}
