'use strict';
// Render: en el build del sitio estático se publica únicamente la URL pública de la API.
const fs=require('node:fs');
const url=(process.env.ITD_API_URL||'').trim().replace(/\/$/,'');
if (!/^https:\/\/[a-zA-Z0-9.-]+(?:\:[0-9]+)?\/api\/v1$/.test(url)) {
  console.error('ITD_API_URL debe ser HTTPS y terminar en /api/v1, por ejemplo https://mi-api.onrender.com/api/v1');
  process.exit(1);
}
fs.writeFileSync('public/runtime-config.js',`window.__ITD_API_URL__=${JSON.stringify(url)};\n`,'utf8');
console.log('API pública configurada para compilación estática.');
