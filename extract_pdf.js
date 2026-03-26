const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('y:\\takip\\Hammer_Kullanimi.pdf');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('y:\\takip\\extract_pdf_out.txt', data.text);
    console.log('Success');
}).catch(function(error){
    console.error(error);
});
