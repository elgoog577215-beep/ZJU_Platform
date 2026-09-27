const path = require("path");

// Applies to existing uploads as well as new imports. HTML is still accepted by
// the document importer, but must never execute in the application's origin.
const uploadSecurityHeaders = (res, filePath) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
        "Content-Security-Policy",
        "sandbox; default-src 'none'; base-uri 'none'; form-action 'none'"
    );
    if (
        /\.(?:html?|xhtml|svg|xml|js|mjs|php\d*|phtml|jsp|aspx?|exe|sh|bat)$/i.test(
            path.extname(filePath)
        )
    ) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment");
        res.setHeader("Cache-Control", "no-store");
    }
};

module.exports = { uploadSecurityHeaders };
