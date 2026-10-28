import { Link } from 'react-router-dom';
import type { ContentItem } from '../lib/types';
import { LockIcon, UnlockIcon } from './Icon';

function Thumb({ item }: { item: ContentItem }) {
  if (item.thumbnailUrl) {
    return (
      <img
        src={item.thumbnailUrl}
        alt={item.title}
        loading="lazy"
        className="h-32 w-full object-cover"
      />
    );
  }
  // Gradient placeholder derived from the title.
  const hue = (item.title.charCodeAt(0) * 37) % 360;
  return (
    <div
      className="flex h-32 w-full items-center justify-center text-3xl font-bold text-white/70"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 60% 35%), hsl(${(hue + 60) % 360} 60% 25%))`,
      }}
    >
      {item.title.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function ContentCard({ item }: { item: ContentItem }) {
  const locked = item.isLocked && !item.unlocked;
  return (
    <Link
      to={`/content/${item.id}`}
      className="group relative block overflow-hidden rounded-2xl bg-tg-secondary shadow-card transition active:scale-[0.98]"
    >
      <div className="relative">
        <Thumb item={item} />
        <span
          className={`absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium backdrop-blur ${
            locked ? 'bg-black/55 text-amber-300' : 'bg-black/55 text-emerald-300'
          }`}
        >
          {locked ? <LockIcon width={13} height={13} /> : <UnlockIcon width={13} height={13} />}
          {locked ? 'Locked' : item.isLocked ? 'Unlocked' : 'Free'}
        </span>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</h3>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-xs text-tg-hint">{item.description}</p>
        )}
      </div>
    </Link>
  );
}

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-tg-secondary shadow-card">
      <div className="shimmer relative h-32 w-full bg-white/5" />
      <div className="space-y-2 p-3">
        <div className="shimmer relative h-3 w-3/4 rounded bg-white/5" />
        <div className="shimmer relative h-3 w-1/2 rounded bg-white/5" />
      </div>
    </div>
  );
}
