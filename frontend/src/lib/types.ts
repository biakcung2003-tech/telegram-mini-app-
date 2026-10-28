export interface Category {
  id: number;
  slug: string;
  name: string;
}

export interface ProviderRef {
  key: string;
  label: string;
}

export interface UnlockInfo {
  monetizationEnabled: boolean;
  requiredAds: number;
  durationSeconds: number;
  providers: ProviderRef[];
}

export interface SponsoredLink {
  label: string;
  url: string;
}

export interface ContentItem {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  categoryId: number | null;
  isLocked: boolean;
  unlocked: boolean;
  views: number;
  body?: string;
  unlock?: UnlockInfo;
  sponsored?: SponsoredLink;
}
