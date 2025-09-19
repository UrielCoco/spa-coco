import React from 'react';
import { useItinerary } from '@/store/itinerary.store';

export default function ItineraryJsonView() {
  const itinerary = useItinerary((s) => s.itinerary);

  return (
    <pre className="h-full w-full overflow-auto rounded-md bg-[#070c14] p-3 text-xs leading-relaxed text-[#cde1ff]">
      {JSON.stringify(itinerary, null, 2)}
    </pre>
  );
}
