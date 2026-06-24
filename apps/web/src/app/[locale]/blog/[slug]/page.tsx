'use client';

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
  content: string;
  category: string;
  date: string;
  readTime: number;
  coverImage?: string;
  author?: {
    name: string;
    avatar?: string;
    bio?: string;
  };
  relatedPosts?: Array<{
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    coverImage?: string;
    date: string;
    readTime: number;
  }>;
}

const WHATSAPP_NUMBER = '905000000000';

export default function BlogPostPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  const slug = params?.slug as string;

  const { data: post, isLoading, isError } = useQuery<BlogPost>({
    queryKey: ['blog-post', slug],
    queryFn: () => publicApi.getBlogPost(slug).then((r: any) => r?.data ?? r),
    enabled: !!slug,
  });

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi! I read your article "${post?.title ?? ''}" and I have a question.`)}`;

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-3xl mx-auto px-6 pt-20 pb-16 space-y-6">
          <div className="h-8 w-3/4 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 rounded bg-white/5 animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <div className="text-center space-y-4">
          <p className="text-4xl">404</p>
          <p className="text-lg font-semibold">Post not found</p>
          <Link href={`/${locale}/blog`} className="text-sm transition hover:underline" style={{ color: 'var(--accent)' }}>
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Hero */}
      <div className="max-w-3xl mx-auto px-6 pt-16 pb-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs mb-8" style={{ color: 'var(--text-muted)' }}>
          <Link href={`/${locale}`} className="hover:underline">Home</Link>
          <span>/</span>
          <Link href={`/${locale}/blog`} className="hover:underline">Blog</Link>
          <span>/</span>
          <span style={{ color: 'var(--text-secondary)' }} className="truncate max-w-xs">{post.title}</span>
        </nav>

        {/* Category + Meta */}
        <div className="flex items-center gap-3 mb-4">
          <span
            className="px-3 py-0.5 rounded-full text-xs font-medium capitalize"
            style={{ background: 'rgba(91,141,239,0.1)', color: 'var(--accent)', border: '1px solid rgba(91,141,239,0.2)' }}
          >
            {post.category}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {post.date ? new Date(post.date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{post.readTime} min read</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-6">{post.title}</h1>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)' }}>{post.excerpt}</p>
        )}

        {/* Author */}
        {post.author && (
          <div className="flex items-center gap-3 mb-8 pb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {post.author.avatar ? (
              <Image src={post.author.avatar} alt={post.author.name} width={40} height={40} className="rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'var(--accent)' }}>
                {post.author.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold">{post.author.name}</p>
              {post.author.bio && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{post.author.bio}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cover Image */}
      {post.coverImage && (
        <div className="relative w-full max-w-4xl mx-auto px-6 mb-12 h-64 sm:h-96">
          <div className="relative h-full rounded-2xl overflow-hidden">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      )}

      {/* Article Content */}
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <article
          className="prose prose-invert prose-sm sm:prose-base max-w-none"
          style={{
            '--tw-prose-body': 'var(--text-secondary)',
            '--tw-prose-headings': 'var(--text-primary)',
            '--tw-prose-links': 'var(--accent)',
            '--tw-prose-bold': 'var(--text-primary)',
            '--tw-prose-code': 'var(--text-primary)',
            '--tw-prose-pre-bg': 'var(--bg-elevated)',
          } as React.CSSProperties}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* WhatsApp CTA */}
        <div
          className="mt-16 rounded-2xl p-8 text-center space-y-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="text-3xl">💬</div>
          <h2 className="text-xl font-bold">Have questions?</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Reach out to our team on WhatsApp and get expert SEO advice directly.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition hover:opacity-90"
            style={{ background: '#25D366', color: '#fff' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            Chat on WhatsApp
          </a>
        </div>
      </div>

      {/* Related Posts */}
      {(post.relatedPosts ?? []).length > 0 && (
        <div className="max-w-6xl mx-auto px-6 pb-20">
          <h2 className="text-xl font-bold mb-6">Related Posts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(post.relatedPosts ?? []).map((related) => (
              <Link
                key={related.id}
                href={`/${locale}/blog/${related.slug}`}
                className="group rounded-2xl overflow-hidden flex flex-col transition hover:scale-[1.01]"
                style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {related.coverImage ? (
                  <div className="relative h-40 overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                    <Image src={related.coverImage} alt={related.title} fill className="object-cover transition group-hover:scale-105" />
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-3xl" style={{ background: 'var(--bg-elevated)' }}>📝</div>
                )}
                <div className="p-5 space-y-2 flex-1">
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition">
                    {related.title}
                  </h3>
                  <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{related.excerpt}</p>
                  <div className="flex items-center justify-between text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
                    <span>{related.date ? new Date(related.date).toLocaleDateString(locale) : ''}</span>
                    <span>{related.readTime} min</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
