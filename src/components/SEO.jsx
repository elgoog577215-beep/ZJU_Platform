import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

const SITE_NAME = '拓途浙享';
const SITE_ALT_NAME = 'TUOTUZJU';
const DEFAULT_DESCRIPTION =
  'AI生态团队信息聚合平台，聚合活动、画廊、播客、视频与 AI 社区内容。';

const toAbsoluteUrl = (siteUrl, value) => {
  if (!value) return `${siteUrl}/pwa-icon.svg`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${siteUrl}${value.startsWith('/') ? value : `/${value}`}`;
};

const SEO = ({
  title,
  description,
  image,
  url,
  type = 'website',
  article = {},
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'zh';
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tuotuzj.com';
  const siteName = t('seo.site_name', SITE_NAME);
  const siteAltName = t('seo.site_alt_name', SITE_ALT_NAME);
  const defaultDescription = t('seo.default_desc', DEFAULT_DESCRIPTION);
  const authorName = t('seo.author', 'AI生态团队');
  const keywords = t(
    'seo.keywords',
    '拓途浙享, 浙江大学, AI生态团队, 活动, 画廊, 播客, 视频, AI社区, 校园平台',
  );

  const seoTitle = title ? `${title} | ${siteName}` : `${siteName} | ${siteAltName}`;
  const seoDescription = description || defaultDescription;
  const seoImage = toAbsoluteUrl(siteUrl, image);
  const seoUrl = url || siteUrl;

  return (
    <Helmet>
      <html lang={lang} />
      <title>{seoTitle}</title>
      <meta name="title" content={seoTitle} />
      <meta name="description" content={seoDescription} />
      <meta name="author" content={authorName} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow" />
      <meta name="theme-color" content="#0a0a0a" />
      <link rel="canonical" href={seoUrl} />

      <meta property="og:type" content={type} />
      <meta property="og:url" content={seoUrl} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={seoImage} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={lang === 'zh' ? 'zh_CN' : 'en_US'} />

      {type === 'article' && (
        <>
          <meta property="article:published_time" content={article.publishedTime} />
          <meta property="article:modified_time" content={article.modifiedTime} />
          <meta property="article:author" content={article.author} />
          <meta property="article:section" content={article.section} />
          {article.tags?.map((tag, index) => (
            <meta key={index} property="article:tag" content={tag} />
          ))}
        </>
      )}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={seoUrl} />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={seoImage} />

      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: siteName,
          alternateName: siteAltName,
          url: siteUrl,
          logo: `${siteUrl}/pwa-icon.svg`,
          description: defaultDescription,
          founder: {
            '@type': 'Organization',
            name: authorName,
          },
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: 'service@tuotuzju.com',
          },
        })}
      </script>

      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: siteName,
          alternateName: siteAltName,
          url: siteUrl,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${siteUrl}/search?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        })}
      </script>
    </Helmet>
  );
};

export default SEO;
