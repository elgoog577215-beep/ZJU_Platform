const IMAGE_ONLY_TEXT_LIMIT = 100;
const IMAGE_ONLY_MIN_IMAGES = 2;

const normalizeContentText = (value) => String(value || "").trim();

const meaningfulTextLength = (value) =>
    Array.from(normalizeContentText(value).replace(/\s+/gu, "")).length;

const normalizeImages = (images) =>
    Array.isArray(images)
        ? [...new Set(images.map((image) => String(image || "").trim()).filter(Boolean))]
        : [];

const classifyWechatArticleContent = ({ contentText = "", images = [] } = {}) => {
    const normalizedText = normalizeContentText(contentText);
    const normalizedImages = normalizeImages(images);
    const textLength = meaningfulTextLength(normalizedText);
    const imageOnly =
        textLength < IMAGE_ONLY_TEXT_LIMIT && normalizedImages.length >= IMAGE_ONLY_MIN_IMAGES;

    return {
        contentStatus: !normalizedText ? "empty" : imageOnly ? "image_only" : "fetched",
        imageOnly,
        imageCount: normalizedImages.length,
        textLength,
    };
};

module.exports = {
    IMAGE_ONLY_MIN_IMAGES,
    IMAGE_ONLY_TEXT_LIMIT,
    classifyWechatArticleContent,
    meaningfulTextLength,
};
