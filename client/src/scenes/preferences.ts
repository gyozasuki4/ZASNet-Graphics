export interface AppPreferences {
  backendUrl: string;
  leftPanelWidth: number;
  rightPanelWidth: number;
  timelineHeight: number;
  canvasZoom: number;
  developerDiagnostics: boolean;
}

export const APP_PREFERENCES_STORAGE_KEY = 'zasnet.preferences.v1';
export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  backendUrl: 'http://127.0.0.1:8080', leftPanelWidth: 288, rightPanelWidth: 304,
  timelineHeight: 104, canvasZoom: 1, developerDiagnostics: false,
};

export function loadPreferences(storage: Pick<Storage, 'getItem'> = localStorage): AppPreferences {
  try {
    const parsed = JSON.parse(storage.getItem(APP_PREFERENCES_STORAGE_KEY) || 'null') as Partial<AppPreferences> | null;
    return { ...DEFAULT_APP_PREFERENCES, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch { return { ...DEFAULT_APP_PREFERENCES }; }
}

export function savePreferences(preferences: AppPreferences, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(APP_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}
