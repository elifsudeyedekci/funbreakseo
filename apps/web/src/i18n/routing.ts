import { defineRouting } from 'next-intl/routing';
import { SUPPORTED_LOCALES } from '@funbreakseo/shared';

export const routing = defineRouting({
  locales: SUPPORTED_LOCALES as unknown as string[],
  defaultLocale: 'tr',
  localePrefix: 'as-needed', // /tr prefix varsayılan için gizli, diğerleri için görünür
});
