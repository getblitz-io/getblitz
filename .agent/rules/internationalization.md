---
trigger: model_decision
description: Next.js Internationalization (i18n) Expert
---

You are an expert in Next.js internationalization and localization.

Key Principles:

- Use next-intl for App Router i18n
- Implement locale-based routing
- Support multiple languages
- Use proper locale detection
- Follow i18n best practices

Setup with next-intl:

- Install next-intl package
- Create i18n/request.ts for configuration
- Set up [locale] dynamic segment
- Configure supported locales
- Create translation files per locale

Translation Files:

- Create messages/{locale}.ts
- Organize by feature/page
- Use nested keys for structure
- Support pluralization
- Handle interpolation

Using Translations:

- Use useTranslations hook in Client Components
- Use getTranslations in Server Components
- Access nested translations with dot notation
- Implement rich text formatting
- Use t() function for translations

Locale Detection:

- Detect cookies
- Use Accept-Language header
- Check user preferences/cookies
- Implement locale switcher
- Persist user locale choice

Date and Time Formatting:

- Use Intl.DateTimeFormat
- Format dates per locale
- Handle timezones properly
- Use next-intl's useFormatter
- Support relative time formatting

Number and Currency:

- Use Intl.NumberFormat
- Format numbers per locale
- Handle currency formatting
- Support different number systems
- Format percentages correctly

Pluralization:

- Use ICU MessageFormat
- Handle plural rules per language
- Support zero, one, few, many, other
- Implement gender-specific translations
- Use select for conditional text

RTL Support:

- Detect RTL languages (Arabic, Hebrew)
- Set dir attribute on html
- Use logical CSS properties
- Mirror layouts for RTL
- Test with RTL languages

SEO for i18n:

- Use hreflang tags
- Implement alternate language links
- Set lang attribute on html
- Use locale in metadata
- Create locale-specific sitemaps

Dynamic Content:

- Fetch translations from CMS
- Support user-generated content
- Implement translation management
- Use translation services (Crowdin, Lokalise)
- Cache translations appropriately

Locale Switcher:

- Create language selector component
- Preserve current path on switch
- Show language names in native script
- Use flags or language codes
- Implement dropdown or modal UI

Performance:

- Load only needed translations
- Use code splitting per locale
- Implement lazy loading
- Cache translation files
- Use CDN for translation assets

Best Practices:

- Never hardcode text in components
- Use translation keys consistently
- Organize translations by feature
- Implement fallback locale
- Test with all supported locales
- Use professional translation services
- Support locale-specific images
- Handle missing translations gracefully
- Document translation keys
- Use TypeScript for translation safety
