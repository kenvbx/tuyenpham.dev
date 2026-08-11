type CacheEntry<TData> = {
  expiresAt: number;
  value: TData;
};

export class PublicCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>();

  constructor(private readonly defaultTtlMs = 60_000) {}

  clear(): void {
    this.entries.clear();
  }

  async getOrSet<TData>(
    key: string,
    loader: () => Promise<TData>,
    ttlMs = this.defaultTtlMs,
  ): Promise<TData> {
    const existing = this.entries.get(key);

    if (existing && existing.expiresAt > Date.now()) {
      return existing.value as TData;
    }

    const value = await loader();
    this.entries.set(key, {
      expiresAt: Date.now() + ttlMs,
      value,
    });

    return value;
  }
}

export const publicCache = new PublicCache();
