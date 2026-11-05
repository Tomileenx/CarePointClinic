// Types mirror the backend OpenAPI spec (https://booking-api-ngrf.onrender.com/v3/api-docs) exactly.

export type BookingStatus = "CONFIRMED" | "CANCELLED";

/** components.schemas.AppointmentSlotResponse */
export interface AppointmentSlot {
  id: string;
  provider: string;
  start: string;
  end: string;
  available: boolean;
}

/** GET /slots returns a plain array of AppointmentSlotResponse (no pagination). */

/** components.schemas.BookingRequest */
export interface BookingRequest {
  slotId: string;
  name: string;
  email: string;
}

/** components.schemas.BookingResponse */
export interface BookingResponse {
  id: string;
  slotId: string;
  name: string;
  email: string;
  status: BookingStatus;
  createdAt: string;
}

/** components.schemas.BookingPage */
export interface BookingPage {
  items: BookingResponse[];
  next_cursor?: string | null | undefined;
}

/** components.schemas.ErrorResponse */
export interface ApiErrorResponse {
  error?: string;
  code?: string;
  now?: string;
}
