import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

const SITE_NAME = "拓浙AI生态";
const SITE_ALT_NAME = "TUOZHE AI ECOSYSTEM";
const DEFAULT_DESCRIPTION =
    "拓浙AI生态连接学生、学院、企业与真实 AI 需求，让机会、学习、项目、赛事和成果持续形成下一次合作。";

const toAbsoluteUrl = (siteUrl, value) => {
    if (!value) return `${siteUrl}/newlogo.png`;
    if (/^https?:\/\//i.test(value)) return value;
    return `${siteUrl}${value.startsWith("/") ? value : `/${value}`}`;
};

const SEO = ({ title, description, image, url, type = "website", article = {} }) => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language || "zh";
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://tuotuzj.com";
    const siteName = t("seo.site_name", SITE_NAME);
    const siteAltName = t("seo.site_alt_name", SITE_ALT_NAME);
    const defaultDescription = t("seo.default_desc", DEFAULT_DESCRIPTION);
    const authorName = t("seo.author", "拓浙AI生态");
    const keywords = t(
        "seo.keywords",
        "拓浙AI生态, 浙江大学, AI社区, 校园机会, 项目实践, 浙客松, 产学协作"
    );

    const normalizedTitle = typeof title === "string" ? title.trim() : "";
    const seoTitle =
        !normalizedTitle || normalizedTitle === siteName
            ? `${siteName} | ${siteAltName}`
            : normalizedTitle.includes(siteName) || normalizedTitle.includes(siteAltName)
              ? normalizedTitle
              : `${normalizedTitle} | ${siteName}`;
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
            <meta property="og:locale" content={lang === "zh" ? "zh_CN" : "en_US"} />

            {type === "article" && (
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
                    "@context": "https://schema.org",
                    "@type": "Organization",
                    name: siteName,
                    alternateName: siteAltName,
                    url: siteUrl,
                    logo: `${siteUrl}/newlogo.png`,
                    description: defaultDescription,
                    contactPoint: {
                        "@type": "ContactPoint",
                        contactType: "customer support",
                        email: "service@tuotuzju.com",
                    },
                })}
            </script>

            <script type="application/ld+json">
                {JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "WebSite",
                    name: siteName,
                    alternateName: siteAltName,
                    url: siteUrl,
                    potentialAction: {
                        "@type": "SearchAction",
                        target: `${siteUrl}/search?q={search_term_string}`,
                        "query-input": "required name=search_term_string",
                    },
                })}
            </script>
        </Helmet>
    );
};

export default SEO;
