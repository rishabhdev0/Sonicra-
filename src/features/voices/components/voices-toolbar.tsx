import { useState } from "react";
import { useQueryState } from "nuqs";
import { useDebouncedCallback } from "use-debounce";
import { Mic2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";
import { voicesSearchParams } from "@/features/voices/lib/params";
import { VoiceCreateDialog } from "./voice-create-dialog";

export function VoicesToolbar() {
  const [query, setQuery] = useQueryState(
    "query",
    voicesSearchParams.query
  );
  const [localQuery, setLocalQuery] = useState(query);

  const debouncedSetQuery = useDebouncedCallback(
    (value: string) => setQuery(value),
    300,
  );

  return (
    <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase text-primary">Voice catalog</p>
        <h2 className="mt-1 text-xl font-semibold">Find the right delivery</h2>
        <p className="mt-1 text-sm text-muted-foreground">Preview built-in talent or clone a voice for your workspace.</p>
      </div>

      <div className="flex items-center gap-2 sm:shrink-0">
          <InputGroup className="h-9 flex-1 bg-card sm:w-64 sm:flex-none">
            <InputGroupAddon>
              <Search className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search voices..."
              value={localQuery}
              onChange={(e) => {
                setLocalQuery(e.target.value);
                debouncedSetQuery(e.target.value);
              }}
            />
          </InputGroup>
          <VoiceCreateDialog>
            <Button size="sm" className="h-9 shrink-0">
              <Mic2 className="size-4" />
              <span className="hidden sm:inline">Clone voice</span>
              <span className="sm:hidden">Clone</span>
            </Button>
          </VoiceCreateDialog>
      </div>
    </div>
  );
};
