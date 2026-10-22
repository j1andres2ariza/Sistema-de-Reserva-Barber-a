import catalog from "../../shared/catalog.json";
export const BARBERSHOP_NAME = "Barbería Edwin Zambrano";
export const BARBERSHOP_SLOGAN = "Estilo, elegancia y precisión";
export const BARBERSHOP_LOCATION = "Santa Marta, Colombia";
export const BARBERSHOP_PHONE = "3015070012";
export const BARBERSHOP_FACEBOOK =
  "https://www.facebook.com/edwinzambranobarberia/";
export const BARBERSHOP_INSTAGRAM =
  "https://www.instagram.com/barberiaedwinzambrano/";

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // minutes
}

export const SERVICES: Service[] = catalog;

import barberJainer from "@/assets/barber-jainer.jpeg";
import barberEdwin from "@/assets/barber-edwin.jpeg";
import barberDiego from "@/assets/barber-diego.jpeg";
import barberAndres from "@/assets/barber-andres.jpeg";

export interface Barber {
  id: string;
  name: string;
  position: number;
  photo: string;
  is_active?: boolean;
  commission_rate?: number;
}

// Fallback photos when DB doesn't have an uploaded photo yet
export const BARBER_FALLBACK_PHOTOS: Record<string, string> = {
  jainer: barberAndres,
  edwin: barberDiego,
  diego: barberEdwin,
  andres: barberJainer,
};

// Static fallback list (used if DB hasn't loaded yet)
export const BARBERS: Barber[] = [
  {
    id: "jainer",
    name: "Jainer Cuenta",
    position: 1,
    photo: BARBER_FALLBACK_PHOTOS.jainer,
  },
  {
    id: "edwin",
    name: "Edwin Zambrano",
    position: 2,
    photo: BARBER_FALLBACK_PHOTOS.edwin,
  },
  {
    id: "diego",
    name: "Diego Pérez",
    position: 3,
    photo: BARBER_FALLBACK_PHOTOS.diego,
  },
  {
    id: "andres",
    name: "Andrés García",
    position: 4,
    photo: BARBER_FALLBACK_PHOTOS.andres,
  },
];

export const DEFAULT_SCHEDULE = {
  weekday: { open: "09:00", close: "19:30" },
  weekend: { open: "09:00", close: "17:00" },
};

export const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
];

export function formatPrice(price: number): string {
  return `$${price.toLocaleString("es-CO")}`;
}

// Returns the list of 30-min slot keys occupied by a booking starting at `time` for `durationMin`.
export function getOccupiedSlots(time: string, durationMin: number): string[] {
  const slotsCount = Math.max(1, Math.ceil(durationMin / 30));
  const [h, m] = time.split(":").map(Number);
  let total = h * 60 + m;
  const out: string[] = [];
  for (let i = 0; i < slotsCount; i++) {
    const hh = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const mm = (total % 60).toString().padStart(2, "0");
    out.push(`${hh}:${mm}`);
    total += 30;
  }
  return out;
}

export interface Booking {
  id: string;
  clientName: string;
  clientPhone: string;
  barberId: string;
  serviceId: string;
  date: string;
  time: string;
  createdAt: string;
}
