import { BLOGS_EN } from './blogs-en';
import { BLOGS_DE, BLOGS_FR } from './blogs-de-fr';
import { BLOGS_ES, BLOGS_RU } from './blogs-es-ru';
import { BLOGS_AR, BLOGS_HI } from './blogs-ar-hi';
import { BLOGS_TR_EXPANSIONS } from './blogs-tr-expansions';
import { mdToHtml, type IntlBlogContent } from './types';

export { mdToHtml };
export type { IntlBlogContent };

/** Slug → tam içerik. Seed, bu kayıtları mevcut blog verisinin üzerine yazar. */
export const FULL_BLOG_CONTENT: Record<string, IntlBlogContent> = {
  ...BLOGS_EN,
  ...BLOGS_DE,
  ...BLOGS_FR,
  ...BLOGS_ES,
  ...BLOGS_RU,
  ...BLOGS_AR,
  ...BLOGS_HI,
  ...BLOGS_TR_EXPANSIONS,
};
