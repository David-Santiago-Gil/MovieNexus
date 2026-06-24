// local-api.cjs — Servidor de desarrollo local para /api/chat
// Ejecutar con: node local-api.cjs
// Este archivo replica la función serverless de Vercel en local

const http = require('http');
const fs = require('fs');
const path = require('path');

// ── Leer .env manualmente (sin dotenv) ──────────────────────────────────────
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  envFile.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  });
  console.log('✅ Variables de entorno cargadas desde .env');
} catch {
  console.warn('⚠️  No se encontró archivo .env');
}

// ── Handler del chat (copia de api/chat.js adaptada a CJS) ─────────────────
const SYSTEM_INSTRUCTION = `Eres David, el asistente virtual de MovieNexus.

Tus directrices:
- Escribe con un tono profesional, amable y directo.
- Evita el uso excesivo de emojis. Usa como máximo 1 o 2 por mensaje para mantener la elegancia.
- Sé breve y preciso. Responde de forma concisa (máximo 80-120 palabras) para no abrumar al usuario con párrafos largos.
- Cuando te pidan recomendaciones, menciona brevemente las películas en 1 o 2 líneas cada una, y SIEMPRE incluye al final de tu mensaje la lista en este formato exacto:
  |||MOVIES:["Nombre Película 1","Nombre Película 2","Nombre Película 3"]|||
- Si no se piden recomendaciones, no incluyas el bloque JSON de películas.
- Mantente siempre en tu rol de asistente experto de cine de MovieNexus.`;

async function handleChat(body) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada en .env');

  const { history, message } = body;
  if (!message) throw new Error('Message is required');

  const contents = [];
  if (history && Array.isArray(history)) {
    for (const turn of history) {
      contents.push({ role: turn.role, parts: [{ text: turn.text }] });
    }
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  const requestBody = {
    system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents,
    generationConfig: {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 0 },
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || `Gemini error ${res.status}`);
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    'Lo siento, no pude generar una respuesta. ¡Inténtalo de nuevo! 🎬';

  return { text };
}

// ── Servidor HTTP ────────────────────────────────────────────────────────────
const PORT = 3001;

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const result = await handleChat(parsed);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error('Error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`\n🎬 MovieNexus API Local corriendo en http://localhost:${PORT}`);
  console.log(`   Proxy activo: /api/chat → Gemini 2.5 Flash Lite`);
  console.log(`   Clave: ${process.env.GEMINI_API_KEY ? '✅ Cargada' : '❌ NO encontrada'}\n`);
});
