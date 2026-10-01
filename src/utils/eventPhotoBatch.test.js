import test from "node:test";
import assert from "node:assert/strict";
import { appendPhotoFiles, isRetryablePhoto, batchPhotoTitle } from "./eventPhotoBatch.js";
const photo = (n) => ({ name: `photo-${n}.jpg`, size: 100, type: "image/jpeg", lastModified: n });
test("multiple selections append uniquely and explicitly report invalid files and overflow", () => {
    const first = appendPhotoFiles([], [photo(1), photo(2)]).added;
    const second = appendPhotoFiles(first, [
        photo(2),
        ...Array.from({ length: 24 }, (_, i) => photo(i + 3)),
        { ...photo(50), type: "video/mp4" },
    ]);
    assert.equal(second.added.length, 22);
    assert.deepEqual(second.rejected, { duplicate: 1, overflow: 2, invalid: 1 });
});
test("retry skips confirmed submissions and ambiguous save results", () => {
    const entries = ["saved", "failed", "pending", "uncertain", "uploading"].map((status) => ({
        status,
    }));
    assert.deepEqual(
        entries.filter(isRetryablePhoto).map((x) => x.status),
        ["failed", "pending"]
    );
});
test("photo titles default to filenames, or use stable selection order for batch title", () => {
    assert.equal(batchPhotoTitle(photo(1), "", 0, 2), "photo-1");
    assert.equal(batchPhotoTitle(photo(2), "现场交流", 1, 3), "现场交流 02");
});
