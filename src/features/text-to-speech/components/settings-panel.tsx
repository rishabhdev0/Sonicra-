import { History, Settings } from "lucide-react";

import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger
} from "@/components/ui/tabs";

import { SettingsPanelHistory } from "./settings-panel-history";
import { SettingsPanelSettings } from "./settings-panel-settings";

const tabTriggerClassName =
  "h-7 flex-1 gap-1.5 rounded text-[11px] font-semibold shadow-none data-[state=active]:bg-card data-[state=active]:text-foreground group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm";

export function SettingsPanel() {
   return (
    <div className="hidden w-[360px] min-h-0 flex-col border-l bg-background lg:flex xl:w-[390px]">
      <Tabs
        defaultValue="settings"
        className="flex h-full min-h-0 flex-col gap-y-0"
      >
        <div className="border-b p-3">
        <TabsList className="h-8 w-full rounded-md bg-muted p-0.5 group-data-[orientation=horizontal]/tabs:h-8">
          <TabsTrigger value="settings" className={tabTriggerClassName}>
            <Settings className="size-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="history" className={tabTriggerClassName}>
            <History className="size-4" />
            History
          </TabsTrigger>
        </TabsList>
        </div>
        <TabsContent
          value="settings"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto"
        >
          <SettingsPanelSettings />
        </TabsContent>
        <TabsContent
          value="history"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto"
        >
          <SettingsPanelHistory />
        </TabsContent>
      </Tabs>
    </div>
   );
};
