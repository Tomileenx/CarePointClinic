import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronsUpDown,
  Clock,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  TriangleAlert,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bookingService } from "@/services/bookingService";
import { lagosToUtcIso, LAGOS_TIME_ZONE } from "@/lib/booking-utils";
import { errorMessage } from "./Feedback";
import type { AppointmentSlotResetRequest } from "@/types/booking";

interface Props {
  onSuccess?: () => void;
}

export interface SlotFormEntry {
  provider: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM in 12-hour format (e.g. "09:30")
  startPeriod: "AM" | "PM";
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:MM in 12-hour format (e.g. "10:00")
  endPeriod: "AM" | "PM";
}

interface SlotEntryErrors {
  provider?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  timing?: string;
}

const createEmptySlot = (): SlotFormEntry => ({
  provider: "",
  startDate: "",
  startTime: "",
  startPeriod: "AM",
  endDate: "",
  endTime: "",
  endPeriod: "AM",
});

function parseDateSafely(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some((p) => isNaN(p))) return undefined;
  return new Date(parts[0]!, parts[1]! - 1, parts[2]!);
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-");
    if (!y || !m || !d) return "";
    const dateObj = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return dateStr;
  }
}

function formatFriendlyLagos(dateStr: string, timeStr: string, period: "AM" | "PM"): string {
  if (!dateStr || !timeStr) return "";
  try {
    const [y, m, d] = dateStr.split("-");
    if (!y || !m || !d) return "";
    const dateObj = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    const monthName = dateObj.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
    return `${d} ${monthName} ${y}, ${timeStr} ${period}`;
  } catch {
    return `${dateStr} ${timeStr} ${period}`;
  }
}

export function ResetSlotsDialog({ onSuccess }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  // Requirement 5: Start with one empty slot form. No preloading or hardcoded values.
  const [slots, setSlots] = useState<SlotFormEntry[]>([createEmptySlot()]);
  const [errors, setErrors] = useState<Record<number, SlotEntryErrors>>({});
  const [successResponse, setSuccessResponse] = useState<string | null>(null);

  const initializeSlots = () => {
    setSuccessResponse(null);
    setErrors({});
    setSlots([createEmptySlot()]);
  };

  const resetMutation = useMutation({
    mutationFn: (req: AppointmentSlotResetRequest) => bookingService.resetSlots(req),
    onSuccess: async (data) => {
      // Refresh displayed slots using the actual backend response or GET /slots
      if (Array.isArray(data)) {
        qc.setQueriesData({ queryKey: ["slots"] }, data);
        setSuccessResponse(
          `Appointment slots successfully reset (${data.length} slot${data.length === 1 ? "" : "s"} created).`,
        );
      } else {
        const freshSlots = await qc.fetchQuery({
          queryKey: ["slots", ""],
          queryFn: () => bookingService.listSlots(),
        });
        qc.setQueriesData({ queryKey: ["slots"] }, freshSlots);
        setSuccessResponse("Appointment slots successfully reset.");
      }
      await qc.invalidateQueries({ queryKey: ["slots"], refetchType: "all" });
      onSuccess?.();
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      initializeSlots();
      resetMutation.reset();
    }
  };

  // Requirement 5: Allow adding another empty slot form
  const addSlot = () => {
    setSlots((prev) => [...prev, createEmptySlot()]);
  };

  // Requirement 5: Allow removing slot entries
  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const next: Record<number, SlotEntryErrors> = {};
      let nextIdx = 0;
      Object.keys(prev)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach((oldIdx) => {
          if (oldIdx !== index) {
            if (prev[oldIdx]) {
              next[nextIdx] = prev[oldIdx]!;
            }
            nextIdx++;
          }
        });
      return next;
    });
  };

  const updateSlot = <K extends keyof SlotFormEntry>(
    index: number,
    field: K,
    value: SlotFormEntry[K],
  ) => {
    setSlots((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const updated = { ...s, [field]: value };
        // Convenience: auto-fill end date when start date is entered if end date was empty
        if (field === "startDate" && value && !s.endDate) {
          updated.endDate = String(value);
        }
        return updated;
      }),
    );

    // Clear error for edited field
    setErrors((prev) => {
      const row = prev[index];
      if (row && (row[field as keyof SlotEntryErrors] || row.timing)) {
        return {
          ...prev,
          [index]: {
            ...row,
            [field as keyof SlotEntryErrors]: undefined,
            timing: undefined,
          },
        };
      }
      return prev;
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<number, SlotEntryErrors> = {};
    let isValid = true;

    if (slots.length === 0) {
      return false;
    }

    slots.forEach((s, idx) => {
      const rowErr: SlotEntryErrors = {};

      if (!s.provider || !s.provider.trim()) {
        rowErr.provider = "Provider name is required";
        isValid = false;
      }

      if (!s.startDate || !s.startDate.trim()) {
        rowErr.startDate = "Start date is required";
        isValid = false;
      }

      if (!s.startTime || !s.startTime.trim()) {
        rowErr.startTime = "Start time is required (e.g. 09:30)";
        isValid = false;
      } else {
        const startUtc = lagosToUtcIso(s.startDate, s.startTime, s.startPeriod);
        if (!startUtc) {
          rowErr.startTime = "Invalid 12-hour time format (use HH:MM between 01:00 and 12:59)";
          isValid = false;
        }
      }

      if (!s.endDate || !s.endDate.trim()) {
        rowErr.endDate = "End date is required";
        isValid = false;
      }

      if (!s.endTime || !s.endTime.trim()) {
        rowErr.endTime = "End time is required (e.g. 10:00)";
        isValid = false;
      } else {
        const endUtc = lagosToUtcIso(s.endDate, s.endTime, s.endPeriod);
        if (!endUtc) {
          rowErr.endTime = "Invalid 12-hour time format (use HH:MM between 01:00 and 12:59)";
          isValid = false;
        }
      }

      // Check chronological order if both converted cleanly
      if (s.startDate && s.startTime && s.endDate && s.endTime) {
        const startUtc = lagosToUtcIso(s.startDate, s.startTime, s.startPeriod);
        const endUtc = lagosToUtcIso(s.endDate, s.endTime, s.endPeriod);
        if (startUtc && endUtc && Date.parse(endUtc) <= Date.parse(startUtc)) {
          rowErr.timing = "End time must be after start time";
          isValid = false;
        }
      }

      if (Object.keys(rowErr).length > 0) {
        newErrors[idx] = rowErr;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (resetMutation.isPending) return;

    if (!validate()) {
      return;
    }

    // Requirement 4: Automatic ISO 8601 conversion from Africa/Lagos to UTC.
    // Requirement 5: Do not ask for an ID; do not generate UUIDs; submit only provider, start, end.
    const payload: AppointmentSlotResetRequest = {
      slots: slots.map((s) => {
        const startUtc = lagosToUtcIso(s.startDate, s.startTime, s.startPeriod);
        const endUtc = lagosToUtcIso(s.endDate, s.endTime, s.endPeriod);
        return {
          provider: s.provider.trim(),
          start: startUtc!,
          end: endUtc!,
        };
      }),
    };

    resetMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-3.5" />
          Reset slots
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[95vw] max-w-[1200px] sm:max-w-[1200px] max-h-[95vh] flex flex-col gap-0 overflow-hidden rounded-3xl bg-card p-8 border border-border shadow-2xl">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-3 text-3xl font-display text-foreground font-bold tracking-tight">
              <RotateCcw className="size-7 text-primary" />
              Reset Appointment Slots
            </DialogTitle>
            <span className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-foreground">
              {LAGOS_TIME_ZONE} (UTC+1)
            </span>
          </div>
          <DialogDescription className="text-sm text-muted-foreground mt-2 max-w-4xl text-left leading-relaxed">
            Configure appointment slots using local Africa/Lagos time. Date and 12-hour time inputs
            are automatically converted to UTC ISO 8601 for the Spring Boot API. Slot UUIDs are
            generated by the backend.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 mt-2 gap-5">
          {/* Success notice */}
          {successResponse && (
            <div
              role="status"
              className="flex items-center justify-between rounded-2xl bg-success-soft px-4 py-3 text-sm text-success"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 shrink-0" />
                <div>
                  <p className="font-semibold">Reset Succeeded</p>
                  <p className="text-xs opacity-90">{successResponse}</p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setOpen(false)}
                className="h-7 text-xs"
              >
                Close
              </Button>
            </div>
          )}

          {/* Meaningful backend error notice */}
          {resetMutation.isError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
            >
              <AlertCircle className="size-5 shrink-0 mt-0.5 text-destructive" />
              <div className="space-y-1">
                <p className="font-semibold">Reset Failed</p>
                <p className="text-xs text-foreground/90 font-mono">
                  {errorMessage(resetMutation.error)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Check that the backend at <code>https://booking-api-ngrf.onrender.com</code> is
                  active and accepts POST /reset.
                </p>
              </div>
            </div>
          )}

          {/* Warning banner */}
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-orange-300 bg-orange-50 p-4 text-xs"
          >
            <TriangleAlert className="size-5 shrink-0 mt-0.5 text-orange-600" />
            <div>
              <p className="font-semibold text-sm text-orange-800">
                Warning: Destructive Replacement Operation
              </p>
              <p className="mt-1 text-xs leading-relaxed text-orange-900">
                Submitting will permanently delete <strong>ALL existing appointment slots</strong>{" "}
                in the database and replace them with only the{" "}
                <strong>
                  {slots.length === 1
                    ? "1 newly configured slot"
                    : `${slots.length} newly configured slots`}
                </strong>{" "}
                entered below.
              </p>
            </div>
          </div>

          {slots.length === 0 && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center space-y-2">
              <p className="text-sm font-medium text-destructive">
                No slots configured. At least one slot is required before submitting.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSlot}
                className="gap-1.5"
              >
                <Plus className="size-4" /> Add a slot
              </Button>
            </div>
          )}

          {/* Scrollable Slots Container */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5">
            {slots.map((slot, index) => {
              const rowErrors = errors[index] || {};
              const startUtc = lagosToUtcIso(slot.startDate, slot.startTime, slot.startPeriod);
              const endUtc = lagosToUtcIso(slot.endDate, slot.endTime, slot.endPeriod);

              return (
                <div
                  key={index}
                  className="rounded-2xl border border-[#93c5fd]/70 bg-white shadow-xs overflow-hidden"
                >
                  {/* Card Header Strip: Blue tinted bar, Slot # at left, Remove at right */}
                  <div className="flex items-center justify-between bg-[#eff6ff]/80 px-6 py-3.5 border-b border-[#dbeafe]">
                    <div className="flex items-center gap-2.5">
                      <CalendarDays className="size-5 text-[#0066cc]" />
                      <span className="text-base font-bold text-slate-900">Slot #{index + 1}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSlot(index)}
                      className="h-8 px-2.5 text-sm font-semibold text-[#dc2626] hover:bg-red-50 hover:text-[#b91c1c] gap-1.5 transition-colors"
                      disabled={resetMutation.isPending}
                    >
                      <Trash2 className="size-4 text-[#dc2626]" />
                      Remove
                    </Button>
                  </div>

                  {/* Horizontal 3-field layout: Provider | Start Date & Time | End Date & Time */}
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_1.75fr_1.75fr] lg:divide-x divide-slate-100 gap-5 lg:gap-0">
                    {/* Column 1: PROVIDER NAME */}
                    <div className="lg:pr-6 space-y-2">
                      <Label
                        htmlFor={`slot-provider-${index}`}
                        className="text-sm font-semibold text-slate-800 flex items-center gap-1"
                      >
                        Provider Name <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                        <Input
                          id={`slot-provider-${index}`}
                          name="provider"
                          value={slot.provider}
                          placeholder="Enter provider name"
                          disabled={resetMutation.isPending}
                          onChange={(e) => updateSlot(index, "provider", e.target.value)}
                          className={`h-12 pl-10 pr-3 rounded-xl border text-sm bg-white placeholder:text-slate-400 shadow-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
                            rowErrors.provider
                              ? "border-destructive focus-visible:ring-destructive"
                              : "border-slate-200"
                          }`}
                        />
                      </div>
                      {rowErrors.provider && (
                        <p className="text-[11px] text-destructive">{rowErrors.provider}</p>
                      )}
                    </div>

                    {/* Column 2: START DATE & TIME */}
                    <div className="lg:px-6 space-y-2">
                      <Label className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                        Start Date & Time <span className="text-red-500">*</span>
                      </Label>

                      <div className="flex items-center gap-2">
                        {/* Popover Date Control */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              id={`slot-start-date-${index}`}
                              aria-label="Date"
                              value={slot.startDate}
                              disabled={resetMutation.isPending}
                              className={`relative flex items-center justify-between h-12 flex-1 min-w-[130px] rounded-xl border bg-white px-3 text-sm transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                                rowErrors.startDate ? "border-destructive" : "border-slate-200"
                              }`}
                            >
                              <div className="flex items-center min-w-0 overflow-hidden">
                                <Calendar className="size-4 text-slate-400 shrink-0 mr-2" />
                                <span
                                  className={`truncate ${
                                    slot.startDate ? "font-medium text-slate-900" : "text-slate-400"
                                  }`}
                                >
                                  {slot.startDate
                                    ? formatDateDisplay(slot.startDate)
                                    : "Select date"}
                                </span>
                              </div>
                              <ChevronsUpDown className="size-3.5 text-slate-400 shrink-0 ml-1.5" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarPicker
                              mode="single"
                              selected={parseDateSafely(slot.startDate)}
                              onSelect={(date) => {
                                if (date) {
                                  const y = date.getFullYear();
                                  const m = String(date.getMonth() + 1).padStart(2, "0");
                                  const d = String(date.getDate()).padStart(2, "0");
                                  updateSlot(index, "startDate", `${y}-${m}-${d}`);
                                } else {
                                  updateSlot(index, "startDate", "");
                                }
                              }}
                            />
                          </PopoverContent>
                        </Popover>

                        {/* 12-hour Time Input with Clock and Selector */}
                        <div
                          className={`relative flex items-center h-12 w-32 shrink-0 rounded-xl border bg-white px-3 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary ${
                            rowErrors.startTime ? "border-destructive" : "border-slate-200"
                          }`}
                        >
                          <Clock className="size-4 text-slate-400 shrink-0 mr-2 pointer-events-none" />
                          <input
                            id={`slot-start-time-${index}`}
                            type="text"
                            aria-label="Time (HH:MM)"
                            placeholder="9:00 AM"
                            value={slot.startTime}
                            disabled={resetMutation.isPending}
                            onChange={(e) => updateSlot(index, "startTime", e.target.value)}
                            className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                          />
                          <ChevronsUpDown className="size-3.5 text-slate-400 shrink-0 ml-1 pointer-events-none" />
                        </div>

                        {/* AM / PM Segmented Toggle */}
                        <div className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-slate-100/70 p-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateSlot(index, "startPeriod", "AM")}
                            disabled={resetMutation.isPending}
                            className={`h-full px-3.5 text-xs font-bold rounded-lg transition-colors ${
                              slot.startPeriod === "AM"
                                ? "bg-[#0066cc] text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-900"
                            }`}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSlot(index, "startPeriod", "PM")}
                            disabled={resetMutation.isPending}
                            className={`h-full px-3.5 text-xs font-bold rounded-lg transition-colors ${
                              slot.startPeriod === "PM"
                                ? "bg-[#0066cc] text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-900"
                            }`}
                          >
                            PM
                          </button>
                        </div>
                      </div>

                      {(rowErrors.startDate || rowErrors.startTime) && (
                        <p className="text-[11px] text-destructive">
                          {rowErrors.startDate || rowErrors.startTime}
                        </p>
                      )}
                      {startUtc && (
                        <p className="text-[11px] text-muted-foreground font-mono">
                          UTC: {startUtc}
                        </p>
                      )}
                    </div>

                    {/* Column 3: END DATE & TIME */}
                    <div className="lg:pl-6 space-y-2">
                      <Label className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                        End Date & Time <span className="text-red-500">*</span>
                      </Label>

                      <div className="flex items-center gap-2">
                        {/* Popover Date Control */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              id={`slot-end-date-${index}`}
                              aria-label="Date"
                              value={slot.endDate}
                              disabled={resetMutation.isPending}
                              className={`relative flex items-center justify-between h-12 flex-1 min-w-[130px] rounded-xl border bg-white px-3 text-sm transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                                rowErrors.endDate ? "border-destructive" : "border-slate-200"
                              }`}
                            >
                              <div className="flex items-center min-w-0 overflow-hidden">
                                <Calendar className="size-4 text-slate-400 shrink-0 mr-2" />
                                <span
                                  className={`truncate ${
                                    slot.endDate ? "font-medium text-slate-900" : "text-slate-400"
                                  }`}
                                >
                                  {slot.endDate ? formatDateDisplay(slot.endDate) : "Select date"}
                                </span>
                              </div>
                              <ChevronsUpDown className="size-3.5 text-slate-400 shrink-0 ml-1.5" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarPicker
                              mode="single"
                              selected={parseDateSafely(slot.endDate)}
                              onSelect={(date) => {
                                if (date) {
                                  const y = date.getFullYear();
                                  const m = String(date.getMonth() + 1).padStart(2, "0");
                                  const d = String(date.getDate()).padStart(2, "0");
                                  updateSlot(index, "endDate", `${y}-${m}-${d}`);
                                } else {
                                  updateSlot(index, "endDate", "");
                                }
                              }}
                            />
                          </PopoverContent>
                        </Popover>

                        {/* 12-hour Time Input with Clock and Selector */}
                        <div
                          className={`relative flex items-center h-12 w-32 shrink-0 rounded-xl border bg-white px-3 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary ${
                            rowErrors.endTime ? "border-destructive" : "border-slate-200"
                          }`}
                        >
                          <Clock className="size-4 text-slate-400 shrink-0 mr-2 pointer-events-none" />
                          <input
                            id={`slot-end-time-${index}`}
                            type="text"
                            aria-label="Time (HH:MM)"
                            placeholder="9:30 AM"
                            value={slot.endTime}
                            disabled={resetMutation.isPending}
                            onChange={(e) => updateSlot(index, "endTime", e.target.value)}
                            className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                          />
                          <ChevronsUpDown className="size-3.5 text-slate-400 shrink-0 ml-1 pointer-events-none" />
                        </div>

                        {/* AM / PM Segmented Toggle */}
                        <div className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-slate-100/70 p-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateSlot(index, "endPeriod", "AM")}
                            disabled={resetMutation.isPending}
                            className={`h-full px-3.5 text-xs font-bold rounded-lg transition-colors ${
                              slot.endPeriod === "AM"
                                ? "bg-[#0066cc] text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-900"
                            }`}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSlot(index, "endPeriod", "PM")}
                            disabled={resetMutation.isPending}
                            className={`h-full px-3.5 text-xs font-bold rounded-lg transition-colors ${
                              slot.endPeriod === "PM"
                                ? "bg-[#0066cc] text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-900"
                            }`}
                          >
                            PM
                          </button>
                        </div>
                      </div>

                      {(rowErrors.endDate || rowErrors.endTime || rowErrors.timing) && (
                        <p className="text-[11px] text-destructive">
                          {rowErrors.endDate || rowErrors.endTime || rowErrors.timing}
                        </p>
                      )}
                      {endUtc && (
                        <p className="text-[11px] text-muted-foreground font-mono">UTC: {endUtc}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Another Slot Pill Button (matches reference image with no counter text) */}
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={addSlot}
              disabled={resetMutation.isPending}
              className="h-12 px-6 rounded-full border-2 border-[#0066cc] text-[#0066cc] hover:bg-blue-50/70 font-semibold text-base gap-2 shadow-xs transition-colors"
            >
              <Plus className="size-5 text-[#0066cc]" /> Add another slot
            </Button>
          </div>

          {/* Dialog Footer Actions */}
          <DialogFooter className="pt-5 mt-2 border-t border-slate-100 flex items-center justify-end gap-3 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={resetMutation.isPending}
              onClick={() => setOpen(false)}
              className="h-12 px-8 rounded-2xl text-slate-800 font-semibold text-base border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={slots.length === 0 || resetMutation.isPending}
              className="h-12 px-8 rounded-2xl bg-[#0066cc] hover:bg-[#0055aa] text-white font-semibold text-base gap-2.5 shadow-sm transition-colors"
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="size-5 animate-spin" /> Resetting backend…
                </>
              ) : (
                <>
                  <RotateCcw className="size-5" /> Submit Reset ({slots.length}{" "}
                  {slots.length === 1 ? "slot" : "slots"})
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
