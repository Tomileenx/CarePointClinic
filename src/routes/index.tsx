import { createFileRoute } from "@tanstack/react-router";
import { BookingPage } from "@/pages/BookingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Book an Appointment — CarePoint Clinic" },
      {
        name: "description",
        content: "Choose an available time and book your CarePoint Clinic appointment online.",
      },
      { property: "og:title", content: "Book an Appointment — CarePoint Clinic" },
      {
        property: "og:description",
        content: "Choose an available time and book your CarePoint Clinic appointment online.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookingPage,
});
