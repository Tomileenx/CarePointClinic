import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { ResetSlotsDialog } from "@/components/booking/ResetSlotsDialog";
import { lagosToUtcIso } from "@/lib/booking-utils";
import { resetSlotsRequestSchema } from "@/lib/booking-schemas";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ResetSlotsDialog dynamic HTML form with Africa/Lagos date & time inputs", () => {
  it("opens with one empty slot card containing separate date, 12h time, and AM/PM inputs (no slot ID field)", () => {
    renderWithClient(<ResetSlotsDialog />);

    // Click trigger to open modal
    const trigger = screen.getByRole("button", { name: /reset slots/i });
    fireEvent.click(trigger);

    // Modal title
    expect(screen.getByText("Reset Appointment Slots")).toBeInTheDocument();

    // Verify exactly 1 slot card is present
    expect(screen.getByText("Slot #1")).toBeInTheDocument();
    expect(screen.queryByText("Slot #2")).not.toBeInTheDocument();

    // Verify Slot ID is completely absent
    expect(screen.queryByLabelText(/slot id/i)).not.toBeInTheDocument();

    // Verify Provider input is empty with correct label and placeholder
    const providerInput = screen.getByLabelText(/provider name/i) as HTMLInputElement;
    expect(providerInput).toBeInTheDocument();
    expect(providerInput.value).toBe("");
    expect(providerInput.placeholder).toMatch(/enter provider/i);

    // Verify Start and End Date pickers exist and are empty
    const dateInputs = screen.getAllByLabelText(/^date/i) as HTMLInputElement[];
    expect(dateInputs).toHaveLength(2);
    expect(dateInputs[0]?.value).toBe("");
    expect(dateInputs[1]?.value).toBe("");

    // Verify 12-hour Time inputs exist and are empty
    const timeInputs = screen.getAllByLabelText(/^time \(hh:mm\)/i) as HTMLInputElement[];
    expect(timeInputs).toHaveLength(2);
    expect(timeInputs[0]?.value).toBe("");
    expect(timeInputs[1]?.value).toBe("");

    // Verify AM and PM period buttons exist
    const amButtons = screen.getAllByRole("button", { name: "AM" });
    const pmButtons = screen.getAllByRole("button", { name: "PM" });
    expect(amButtons.length).toBeGreaterThanOrEqual(2);
    expect(pmButtons.length).toBeGreaterThanOrEqual(2);

    // Verify destructive replacement warning is displayed
    expect(screen.getByText(/destructive replacement operation/i)).toBeInTheDocument();
  });

  it("adds another empty slot card when 'Add another slot' is clicked", () => {
    renderWithClient(<ResetSlotsDialog />);
    fireEvent.click(screen.getByRole("button", { name: /reset slots/i }));

    const addBtn = screen.getByRole("button", { name: /add another slot/i });
    fireEvent.click(addBtn);

    // Now there are 2 slot cards
    expect(screen.getByText("Slot #1")).toBeInTheDocument();
    expect(screen.getByText("Slot #2")).toBeInTheDocument();

    const providerInputs = screen.getAllByLabelText(/provider name/i) as HTMLInputElement[];
    expect(providerInputs).toHaveLength(2);
    expect(providerInputs[1]?.value).toBe("");
    expect(providerInputs[1]?.placeholder).toMatch(/enter provider/i);

    const dateInputs = screen.getAllByLabelText(/^date/i) as HTMLInputElement[];
    expect(dateInputs).toHaveLength(4); // 2 per card

    const timeInputs = screen.getAllByLabelText(/^time \(hh:mm\)/i) as HTMLInputElement[];
    expect(timeInputs).toHaveLength(4); // 2 per card
  });

  it("removes an individual slot card when Remove is clicked", () => {
    renderWithClient(<ResetSlotsDialog />);
    fireEvent.click(screen.getByRole("button", { name: /reset slots/i }));

    // Add another slot
    fireEvent.click(screen.getByRole("button", { name: /add another slot/i }));
    expect(screen.getByText("Slot #1")).toBeInTheDocument();
    expect(screen.getByText("Slot #2")).toBeInTheDocument();

    // Remove slot #1
    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]!);

    // Only 1 slot card remains
    expect(screen.queryByText("Slot #2")).not.toBeInTheDocument();
    expect(screen.getByText("Slot #1")).toBeInTheDocument();
  });

  it("correctly converts Africa/Lagos input to UTC ISO 8601 without id", () => {
    // 18 October 2026, 10:30 AM in Lagos -> 2026-10-18T09:30:00.000Z UTC
    const startUtc = lagosToUtcIso("2026-10-18", "10:30", "AM");
    const endUtc = lagosToUtcIso("2026-10-18", "11:00", "AM");

    expect(startUtc).toBe("2026-10-18T09:30:00.000Z");
    expect(endUtc).toBe("2026-10-18T10:00:00.000Z");

    const payload = {
      slots: [
        {
          provider: "Dr Anu",
          start: startUtc!,
          end: endUtc!,
        },
      ],
    };

    const parsed = resetSlotsRequestSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.slots[0]).toEqual({
        provider: "Dr Anu",
        start: "2026-10-18T09:30:00.000Z",
        end: "2026-10-18T10:00:00.000Z",
      });
      expect(parsed.data.slots[0]).not.toHaveProperty("id");
    }
  });
});
