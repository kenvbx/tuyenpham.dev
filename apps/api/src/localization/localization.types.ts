export type Language = {
  code: string;
  createdAt: string;
  id: string;
  isActive: boolean;
  isDefault: boolean;
  name: string;
  nativeName: string | null;
  sortOrder: number;
  updatedAt: string;
};

export type TranslationEntry = {
  createdAt: string;
  description: string | null;
  id: string;
  key: string;
  namespace: string;
  translations: Record<string, string>;
  updatedAt: string;
};

export type ContentTranslation = {
  createdAt: string;
  id: string;
  languageCode: string;
  sourceId: string;
  sourceType: string;
  translatedId: string;
  translatedType: string;
};
