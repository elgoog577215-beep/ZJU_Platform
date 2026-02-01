const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const pdfPath = path.join(__dirname, '2025SQTP+栾秀爽+拓途浙享 ·素质拓展信息智能检索平台+立项表.pdf');

const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
}).catch(err => {
    console.error('Error reading PDF:', err);
});
