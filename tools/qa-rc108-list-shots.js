const fs = require('fs');
const path = require('path');
const dest = path.join('docs','audits','rc108-shots');
fs.mkdirSync(dest, { recursive: true });
console.log('shots', fs.readdirSync(dest).filter(f=>/\.png$/i.test(f)).sort());
