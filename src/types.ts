export interface FamilyLinkCardConfig {
  type: string;
  child: string;
  devices?: string[];
  show_apps?: boolean;
  max_apps?: number;
  show_schedules?: boolean;
  name?: string;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  language: string;
  locale: { language: string };
  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<void>;
}

export interface AppData {
  name: string;
  minutes: number;
  package: string;
}

export interface ScreenTimeData {
  used: number;
  total: number | null;
  percentage: number;
}

export interface DeviceScheduleData {
  bedtimeEnabled: boolean;
  bedtimeActive: boolean;
  bedtimeStart: string;
  bedtimeEnd: string;
  bedtimeEntityId: string | null;
  schoolEnabled: boolean;
  schoolActive: boolean;
  schoolStart: string;
  schoolEnd: string;
  schoolEntityId: string | null;
}
