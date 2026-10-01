export const PHOTO_BATCH_LIMIT = 24;
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/bmp";
const mimeTypes = new Set(PHOTO_ACCEPT.split(","));
export const photoFileKey = (file) => `${file.name}:${file.size}:${file.lastModified}`;

export function appendPhotoFiles(current, incoming) {
    const keys = new Set(current.map((entry) => entry.id));
    const added = [];
    const rejected = { invalid: 0, duplicate: 0, overflow: 0 };
    for (const file of incoming) {
        const id = photoFileKey(file);
        if (
            !mimeTypes.has(file.type) ||
            !/\.(jpe?g|png|gif|webp|bmp)$/i.test(file.name) ||
            file.size > 50 * 1024 * 1024
        ) {
            rejected.invalid += 1;
        } else if (keys.has(id)) {
            rejected.duplicate += 1;
        } else if (current.length + added.length >= PHOTO_BATCH_LIMIT) {
            rejected.overflow += 1;
        } else {
            keys.add(id);
            added.push({ id, file, status: "pending", url: null, error: "" });
        }
    }
    return { added, rejected };
}

export const isRetryablePhoto = (entry) => ["pending", "failed"].includes(entry.status);
export const batchPhotoTitle = (file, title, index, total) =>
    title.trim()
        ? total > 1
            ? `${title.trim()} ${String(index + 1).padStart(2, "0")}`
            : title.trim()
        : file.name.replace(/\.[^.]+$/, "");
