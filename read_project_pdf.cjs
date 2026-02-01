const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const pdfPath = 'c:\\Users\\Administrator\\Desktop\\999\\2025SQTP+栾秀爽+拓途浙享 ·素质拓展信息智能检索平台+立项表.pdf';

if (!fs.existsSync(pdfPath)) {
    console.error('File not found:', pdfPath);
    process.exit(1);
}

const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
    console.log('--- PDF CONTENT START ---');
    console.log(data.text);
    console.log('--- PDF CONTENT END ---');
}).catch(err => {
    console.error('Error parsing PDF:', err);
});
