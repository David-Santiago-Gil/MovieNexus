const fs = require('fs');

// Si process.env.API_KEY no existe (entorno local), usamos la clave por defecto para no romper el desarrollo local
const apiKey = process.env.API_KEY || '13d9f450e74792c52f8228e8a87a60ec';

const envConfigFile = `export const environment = {
  production: true,
  baseUrl: 'https://api.themoviedb.org/3',
  apiKey: '${apiKey}',
  imgPath: 'https://image.tmdb.org/t/p/w500'
};
`;

const targetFolderPath = './src/environments';
if (!fs.existsSync(targetFolderPath)) {
  fs.mkdirSync(targetFolderPath, { recursive: true });
}
const targetPath = './src/environments/environment.ts';
fs.writeFileSync(targetPath, envConfigFile);
console.log('✅ Archivo environment.ts generado correctamente.');
