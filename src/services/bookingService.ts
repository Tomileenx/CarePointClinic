import type {
  AppointmentSlot,
  AppointmentSlotResetRequest,
  BookingPage,
  BookingRequest,
  BookingResponse,
} from "@/types/booking";
import {
  proxyCancelBooking,
  proxyCreateBooking,
  proxyGetBooking,
  proxyListBookings,
  proxyListSlots,
  proxyResetSlots,
} from "@/lib/booking-api.functions";
import { unwrap } from "./apiClient";
import {
  slotSchema,
  bookingResponseSchema,
  bookingPageSchema,
  resetSlotsResponseSchema,
} from "@/lib/booking-schemas";
import { z } from "zod";

export const bookingService = {
  async listSlots(provider?: string): Promise<AppointmentSlot[]> {
    return unwrap(proxyListSlots({ data: provider ? { provider } : {} }), slotSchema.array(), 200);
  },
  async createBooking(req: BookingRequest, idempotencyKey: string): Promise<BookingResponse> {
    return unwrap(
      proxyCreateBooking({ data: { ...req, idempotencyKey } }),
      bookingResponseSchema,
      201,
    );
  },
  async getBooking(id: string): Promise<BookingResponse> {
    return unwrap(proxyGetBooking({ data: { id } }), bookingResponseSchema, 200);
  },
  async cancelBooking(id: string): Promise<BookingResponse> {
    return unwrap(proxyCancelBooking({ data: { id } }), bookingResponseSchema, 200);
  },
  async listBookings(email: string, limit: number, cursor?: string): Promise<BookingPage> {
    return unwrap(
      proxyListBookings({ data: { email, limit, ...(cursor ? { cursor } : {}) } }),
      bookingPageSchema,
      200,
    );
  },
  async resetSlots(req: AppointmentSlotResetRequest): Promise<AppointmentSlot[] | string> {
    return unwrap(
      proxyResetSlots({ data: req }),
      resetSlotsResponseSchema.or(z.unknown().transform(() => "Done")),
      200,
    );
  },
};
