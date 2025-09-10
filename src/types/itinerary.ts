export type LabelMap = Record<string, string>

export interface Itinerary {
  labels?: LabelMap
  meta: {
    tripTitle: string
    travelers?: number
    currency?: string
    startDate?: string
    endDate?: string
    notes?: string
  }
  summary: {
    overview: string
    highlights?: string[]
    budgetEstimate?: number
  }
  flights: {
    originCountry: string
    originCity: string
    returnCountry: string
    returnCity: string
    outbound?: FlightInfo
    inbound?: FlightInfo
  }
  days: DayPlan[]
  transports?: TransportLeg[]
  extras?: ExtraService[]
}

export interface FlightInfo {
  airline?: string; code?: string; depTime?: string; arrTime?: string; from?: string; to?: string
}

export interface DayPlan {
  date?: string
  dayIndex: number
  city?: string
  country?: string
  activities: Activity[]
}

export type ActivityTag = 'tour' | 'attraction' | 'restaurant' | 'experience' | 'transfer' | 'free'

export interface Activity {
  time?: string
  title: string
  description?: string
  durationMins?: number
  tag?: ActivityTag
  location?: {
    name?: string; address?: string; coords?: [number, number]
  }
  cost?: number
}

export interface TransportLeg {
  mode: 'car' | 'van' | 'yacht' | 'helicopter' | 'plane' | 'train' | 'walk'
  from: { name?: string; coords?: [number, number] }
  to: { name?: string; coords?: [number, number] }
  etaMins?: number
  notes?: string
}

export interface ExtraService {
  type: 'translator' | 'private_dinner' | 'chef_table' | 'yacht_view' | 'private_event' | 'other'
  title: string
  description?: string
  price?: number
  schedule?: { date?: string; time?: string }
  location?: { name?: string; coords?: [number, number] }
}
