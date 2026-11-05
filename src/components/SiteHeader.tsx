import { Link } from "@tanstack/react-router";
import { Menu, Stethoscope, X } from "lucide-react";
import { useState } from "react";

const links = [
  { to: "/", label: "Book Appointment" },
  { to: "/find-booking", label: "Find Booking" },
] as const;

const linkBase =
  "rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Stethoscope className="size-5" aria-hidden />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            CarePoint Clinic
          </span>
        </Link>

        <nav aria-label="Main" className="hidden gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: true }}
              className={`${linkBase} text-muted-foreground hover:bg-muted hover:text-foreground`}
              activeProps={{
                className: `${linkBase} bg-secondary text-primary`,
                "aria-current": "page",
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="rounded-md p-2 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t bg-card px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: true }}
                className={`${linkBase} text-muted-foreground hover:bg-muted`}
                activeProps={{
                  className: `${linkBase} bg-secondary text-primary`,
                  "aria-current": "page",
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-muted-foreground sm:grid-cols-2 sm:px-6">
        <div>
          <p className="font-display text-lg font-semibold text-foreground">CarePoint Clinic</p>
          <p className="mt-2 max-w-sm">
            This website is an appointment booking interface. It does not provide medical advice.
          </p>
        </div>
        <div className="space-y-1 sm:text-right">
          <p>Address: 5, Bosun-Bookoing, Lagos</p>
          <p>Phone: 09066438016</p>
          <p>Email: carepointclinic@mail.com</p>
        </div>
      </div>
    </footer>
  );
}
