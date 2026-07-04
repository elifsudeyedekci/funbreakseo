export interface IntlBlogContent {
  title: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  readingMinutes: number;
  faqSection: Array<{ question: string; answer: string }>;
  bodyMarkdown: string;
}

/**
 * Seed içeriği için minimal, güvenli markdown → HTML dönüştürücü.
 * Başlık, kalın/italik, liste, link ve paragrafları destekler.
 */
export function mdToHtml(md: string): string {
  const inline = (s: string): string =>
    s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  const blocks = md.split(/\n{2,}/);
  return blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('#### ')) return `<h4>${inline(trimmed.slice(5))}</h4>`;
      if (trimmed.startsWith('### ')) return `<h3>${inline(trimmed.slice(4))}</h3>`;
      if (trimmed.startsWith('## ')) return `<h2>${inline(trimmed.slice(3))}</h2>`;
      if (trimmed.startsWith('# ')) return `<h1>${inline(trimmed.slice(2))}</h1>`;
      const lines = trimmed.split('\n');
      const isUl = lines.every((l) => /^[-*] /.test(l.trim()));
      if (isUl) {
        return `<ul>${lines.map((l) => `<li>${inline(l.trim().slice(2))}</li>`).join('')}</ul>`;
      }
      const isOl = lines.every((l) => /^\d+\. /.test(l.trim()));
      if (isOl) {
        return `<ol>${lines
          .map((l) => `<li>${inline(l.trim().replace(/^\d+\. /, ''))}</li>`)
          .join('')}</ol>`;
      }
      return `<p>${inline(trimmed.replace(/\n/g, '<br/>'))}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}
