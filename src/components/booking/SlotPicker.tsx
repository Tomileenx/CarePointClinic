import { useEffect, useMemo, useState } from "react";
import { CalendarX2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppointmentSlot } from "@/types/booking";
import {
  formatDate,
  formatShortDate,
  formatTime,
  groupSlotsByDate,
  isSlotAvailable,
} from "@/lib/booking-utils";

interface Props {
  slots: AppointmentSlot[];
  selectedId: string | null;
  onSelect: (slot: AppointmentSlot) => void;
}

export function SlotPicker({ slots, selectedId, onSelect }: Props) {
  const groups = useMemo(() => groupSlotsByDate(slots), [slots]);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    if (!groups.find((g) => g.key === activeKey)) {
      const firstFree = groups.find((g) => g.slots.some((s) => isSlotAvailable(s)));
      setActiveKey(firstFree?.key ?? groups[0]?.key ?? null);
    }
  }, [groups, activeKey]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-12 text-center">
        <CalendarX2 className="size-10 text-muted-foreground" aria-hidden />
        <p className="mt-3 font-medium">No appointments available</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Please check back later for new openings.
        </p>
      </div>
    );
  }

  const active = groups.find((g) => g.key === activeKey) ?? groups[0];
  const first = active?.slots[0];
  if (!active || !first) return null;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Appointment dates"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
      >
        {groups.map((g) => {
          const free = g.slots.filter((s) => isSlotAvailable(s)).length;
          const isActive = g.key === active.key;
          const firstSlot = g.slots[0];
          if (!firstSlot) return null;
          return (
            <Button
              variant="outline"
              key={g.key}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => setActiveKey(g.key)}
              className={`flex h-auto min-w-28 shrink-0 flex-col items-start gap-0 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive ? "border-primary bg-secondary" : "bg-card hover:border-primary/40"
              }`}
            >
              <span
                className={`text-sm font-semibold ${isActive ? "text-primary" : "text-foreground"}`}
              >
                {formatShortDate(firstSlot.start)}
              </span>
              <span className="text-xs text-muted-foreground">
                {free === 0 ? "Fully booked" : `${free} available`}
              </span>
            </Button>
          );
        })}
      </div>

      <div role="tabpanel" className="mt-4">
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          {formatDate(first.start)}
        </h3>
        <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-3">
          {active.slots.map((s) => {
            const selected = s.id === selectedId;
            const available = isSlotAvailable(s);
            return (
              <li key={s.id}>
                <Button
                  variant="outline"
                  type="button"
                  disabled={!available}
                  aria-pressed={selected}
                  aria-label={`${formatDate(s.start)} at ${formatTime(s.start)} with ${s.provider}, ${available ? "available" : "unavailable"}`}
                  onClick={() => onSelect(s)}
                  className={`relative flex h-auto w-full flex-col items-start gap-0 rounded-lg border px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground shadow-soft"
                      : available
                        ? "bg-card hover:border-teal hover:bg-teal-soft"
                        : "cursor-not-allowed border-dashed bg-muted text-muted-foreground"
                  }`}
                >
                  <span className={`font-semibold ${!available ? "line-through" : ""}`}>
                    {formatTime(s.start)} – {formatTime(s.end)}
                  </span>
                  <span
                    className={`truncate text-xs ${selected ? "text-primary-foreground/90" : "text-muted-foreground"}`}
                  >
                    {s.provider}
                  </span>
                  <span
                    className={`text-xs ${selected ? "text-primary-foreground/80" : available ? "text-teal" : ""}`}
                  >
                    {selected ? "Selected" : available ? "Available" : "Booked"}
                  </span>
                  {selected && <Check className="absolute right-2 top-2 size-4" aria-hidden />}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
