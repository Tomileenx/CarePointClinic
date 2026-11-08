import { useState } from "react";
import { Check, Search, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  id?: string;
  providers: string[];
  /** Selected provider name, or "" for all providers. */
  value: string;
  onChange: (provider: string) => void;
}

/**
 * Search-as-you-type provider filter. Looks like a search field; clicking it opens a
 * list that narrows as you type. Choosing "All providers" (or the clear button) resets
 * the filter to "".
 */
export function ProviderSearch({ id, providers, value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const choose = (provider: string) => {
    onChange(provider);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-label="Search providers"
            className={cn(
              "flex h-8 w-44 items-center gap-2 rounded-lg border border-input bg-card pl-2.5 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-52",
              value ? "pr-8 text-foreground" : "pr-2.5 text-muted-foreground",
            )}
          >
            <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{value || "Search providers…"}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-0">
          <Command>
            <CommandInput placeholder="Type a provider name…" />
            <CommandList>
              <CommandEmpty>No provider found.</CommandEmpty>
              <CommandGroup>
                <CommandItem value="All providers" onSelect={() => choose("")}>
                  <Check
                    className={cn("mr-2 size-4", value === "" ? "opacity-100" : "opacity-0")}
                  />
                  All providers
                </CommandItem>
                {providers.map((p) => (
                  <CommandItem key={p} value={p} onSelect={() => choose(p)}>
                    <Check
                      className={cn("mr-2 size-4", value === p ? "opacity-100" : "opacity-0")}
                    />
                    {p}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <button
          type="button"
          aria-label="Clear provider filter"
          onClick={() => onChange("")}
          className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
