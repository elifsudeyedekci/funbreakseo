'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface BlogPost {
  slug: string;
  title: string;
  excerpt?: string;
  locale?: string;
  publishedAt?: string;
  readingMinutes?: number;
}

interface BlogGridProps {
  posts: BlogPost[];
  locale: string;
  allLabel: string;
  readTimeLabel: string;
}

function getDateLocale(locale: string) {
  const map: Record<string, string> = {
    tr: 'tr-TR', ar: 'ar-SA', hi: 'hi-IN', ru: 'ru-RU',
    de: 'de-DE', es: 'es-ES', fr: 'fr-FR',
  };
  return map[locale] ?? 'en-US';
}

function formatDate(dateStr: string, locale: string) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString(getDateLocale(locale), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export function BlogGrid({ posts, locale, allLabel, readTimeLabel }: BlogGridProps) {
  const [activeLocale, setActiveLocale] = useState<string>('all');

  const locales = useMemo(() => {
    const set = new Set(posts.map((p) => p.locale ?? 'tr').filter(Boolean));
    return Array.from(set);
  }, [posts]);

  const filtered = useMemo(() => {
    if (activeLocale === 'all') return posts;
    return posts.filter((p) => (p.locale ?? 'tr') === activeLocale);
  }, [posts, activeLocale]);

  const blogBase = locale === 'tr' ? '/blog' : `/${locale}/blog`;

  const localeLabel: Record<string, string> = {
    tr: 'TR', en: 'EN', de: 'DE', fr: 'FR', es: 'ES', ar: 'AR', ru: 'RU', hi: 'HI',
  };

  return (
    <>
      <div className="flex gap-2 flex-wrap justify-center mb-10">
        <button
          key="all"
          onClick={() => setActiveLocale('all')}
          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
            activeLocale === 'all'
              ? 'border-indigo-500/60 bg-indigo-500/20 text-indigo-300'
              : 'border-white/10 text-white/60 hover:bg-white/10'
          }`}
        >
          {allLabel}
        </button>
        {locales.map((loc) => (
          <button
            key={loc}
            onClick={() => setActiveLocale(loc)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              activeLocale === loc
                ? 'border-indigo-500/60 bg-indigo-500/20 text-indigo-300'
                : 'border-white/10 text-white/60 hover:bg-white/10'
            }`}
          >
            {localeLabel[loc] ?? loc.toUpperCase()}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-white/30 text-sm py-12">—</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((post) => (
            <Link
              key={post.slug}
              href={`${blogBase}/${post.slug}`}
              className="group rounded-2xl border border-white/10 bg-white/2 overflow-hidden hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all"
            >
              <div className="h-40 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 flex items-center justify-center">
                <span className="text-4xl opacity-40">📝</span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  {post.locale && (
                    <span className="text-xs rounded-full bg-indigo-500/20 text-indigo-400 px-2 py-0.5">
                      {localeLabel[post.locale] ?? post.locale.toUpperCase()}
                    </span>
                  )}
                  {post.readingMinutes && (
                    <span className="text-xs text-white/30">
                      {post.readingMinutes} {readTimeLabel}
                    </span>
                  )}
                </div>
                <h2 className="font-semibold text-white mb-2 group-hover:text-indigo-300 transition-colors leading-snug">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-xs text-white/50 leading-relaxed mb-3 line-clamp-3">
                    {post.excerpt}
                  </p>
                )}
                {post.publishedAt && (
                  <p className="text-xs text-white/30">
                    {formatDate(post.publishedAt, locale)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
