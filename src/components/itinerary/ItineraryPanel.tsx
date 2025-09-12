import { useRef, useEffect } from "react";
import SummaryCard from "./SummaryCard";
import FlightsCard from "./FlightsCard";
import DayPlanCard from "./DayPlanCard";
import TransportCard from "./TransportCard";
import ExtrasCard from "./ExtrasCard";
import MapSection from "./MapSection";
import { Button } from "@/components/common/Button";
import ToolDebugPane from "@/components/ToolDebugPane"; // 👈 NUEVO

const sections = [
  { id: "summary", label: "Resumen" },
  { id: "flights", label: "Vuelos" },
  { id: "days", label: "Días" },
  { id: "transports", label: "Transportes" },
  { id: "extras", label: "Extras" },
  { id: "map", label: "Mapa" },
];

export default function ItineraryPanel() {
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el || !containerRef.current) return;
    const top = el.offsetTop - 64;
    containerRef.current.scrollTo({ top, behavior: "smooth" });
  };

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    node.tabIndex = 0;
  }, []);

  return (
    <div className="h-full flex flex-col relative">
      {/* barra sticky de navegación */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-black/10">
        <div className="flex items-center gap-2 px-4 py-2 overflow-auto">
          {sections.map((s) => (
            <Button
              key={s.id}
              variant="ghost"
              className="rounded-full border border-black/10 hover:bg-black/5"
              onClick={() => scrollTo(s.id)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* contenido scrolleable */}
      <div ref={containerRef} className="flex-1 overflow-auto p-4 space-y-6">
        <section id="summary">
          <SummaryCard />
        </section>
        <section id="flights">
          <FlightsCard />
        </section>
        <section id="days">
          <DayPlanCard />
        </section>
        <section id="transports">
          <TransportCard />
        </section>
        <section id="extras">
          <ExtrasCard />
        </section>
        <section id="map" className="pb-8">
          <MapSection />
        </section>
      </div>

      {/* Visor de JSON crudo */}
      <ToolDebugPane />
    </div>
  );
}
