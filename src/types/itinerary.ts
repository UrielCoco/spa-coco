// src/types/itinerary.ts
export type Flight = {
  from?: string;
  to?: string;
  date?: string; // ISO
  airline?: string;
  number?: string;
  notes?: string;
};

export type Transport = {
  kind?: 'car' | 'van' | 'train' | 'plane' | 'boat' | 'transfer';
  date?: string; // ISO
  from?: string;
  to?: string;
  provider?: string;
  notes?: string;
};

export type DayActivity = {
  time?: string;          // "08:00"
  title?: string;         // "Hamam tradicional"
  details?: string;       // texto libre
  private?: boolean;
  durationMin?: number;
  location?: string;
  avoidCrowds?: boolean;
};

export type DayPlan = {
  date?: string;          // ISO
  city?: string;
  hotel?: string;
  notes?: string;
  activities?: DayActivity[];
};

export type Extras = Record<string, unknown>;
export type Lights = Record<string, unknown>;

export type Summary = {
  overview?: string;
  askNote?: string;
  originCity?: string;
  returnCity?: string;
  originCountry?: string;
  returnCountry?: string;
};

export type Itinerary = {
  meta: {
    tripTitle: string;
  };
  summary: Summary;
  flights: Flight[];
  days: DayPlan[];
  transports: Transport[];
  extras: Extras;
  lights: Lights;
};
