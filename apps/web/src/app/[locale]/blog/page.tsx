'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '@/lib/api';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: number;
  coverImage?: string;
  author?: string;
}

export default function BlogPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  const [activeCategory, setActiveCategory] = useState('all');

  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ['blog-list', locale],
    queryFn: () => publicApi.getBlogList(locale).then((r: any) => r?.data ?? r ?? []),
  });

  const categories = ['all', ...Array.from(new Set((posts ?? []).map((p) => p.category).filter(Boolean)))];

  const filtered =
    activeCategory === 'all'
      ? (posts ?? [])
      : (posts ?? []).filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Hero */}
      <div className="px-6 pt-20 pb-12 text-center max-w-3xl mx-auto">
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--accent)' }}>FunBreakSEO Blog</p>
        <h1 className="text-4xl font-bold leading-tight">SEO & GEO Insights</h1>
        <p className="mt-4 text-lg" style={{ color: 'var(--text-secondary)' }}>
          Tips, guides, and industry updates to help you rank higher and appear in AI answers.
        </p>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 flex-wrap justify-center px-6 pb-10">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm capitalize transition ${activeCategory === cat ? 'font-semibold' : 'opacity-60 hover:opacity-80'}`}
            style={{
              background: activeCategory === cat ? 'var(--accent)' : 'var(--bg-elevated)',
              color: activeCategory === cat ? '#fff' : 'var(--text-secondary)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {cat === 'all' ? 'All Posts' : cat}
          </button>
        ))}
      </div>

      {/* Posts Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: 'var(--bg-surface)', height: 320 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-20" style={{ color: 'var(--text-muted)' }}>No posts found in this category.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post) => (
              <Link
                key={post.id}
                href={`/${locale}/blog/${post.slug}`}
                className="group rounded-2xl overflow-hidden flex flex-col transition hover:scale-[1.01]"
                style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Cover Image */}
                <div className="relative h-48 overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  {post.coverImage ? (
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      className="object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl">📝</div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--accent)', border: '1px solid rgba(91,141,239,0.2)' }}
                    >
                      {post.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-5 space-y-3">
                  <h2 className="font-semibold leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition">
                    {post.title}
                  </h2>
                  <p className="text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
                    <span>{post.date ? new Date(post.date).toLocaleDateString(locale) : ''}</span>
                    <span>{post.readTime} min read</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
