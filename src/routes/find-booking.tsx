import { createFileRoute } from "@tanstack/react-router";
import { FindBookingPage } from "@/pages/FindBookingPage";

export const Route = createFileRoute("/find-booking")({
  validateSearch: (s: Record<string, unknown>): { ref?: string; email?: string } => ({
    ...(typeof s["ref"] === "string" && s["ref"] ? { ref: s["ref"] } : {}),
    ...(typeof s["email"] === "string" && s["email"] ? { email: s["email"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Find Your Booking — CarePoint Clinic" },
      {
        name: "description",
        content: "Look up or cancel a CarePoint Clinic appointment with your booking reference.",
      },
      { property: "og:title", content: "Find Your Booking — CarePoint Clinic" },
      {
        property: "og:description",
        content: "Look up or cancel a CarePoint Clinic appointment with your booking reference.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FindBookingRoute,
});

function FindBookingRoute() {
  const { ref, email } = Route.useSearch();
  return (
    <FindBookingPage
      {...(ref ? { initialRef: ref } : {})}
      {...(email ? { initialEmail: email } : {})}
    />
  );
}
