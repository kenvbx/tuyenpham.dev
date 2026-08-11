export type SettingValue = boolean | null | number | string | string[] | Record<string, unknown>;

export type SettingEntry = {
  isPublic: boolean;
  key: string;
  namespace: string;
  updatedAt: string;
  value: SettingValue;
};

export type SettingNamespace = {
  entries: Record<string, SettingEntry>;
  namespace: string;
};

export type SettingsSnapshot = Record<string, Record<string, SettingValue>>;

export type SettingsUpdateInput = {
  namespace: string;
  updatedBy?: string | null | undefined;
  values: Record<string, SettingValue>;
};

export type EmailTestInput = {
  recipient: string;
};
