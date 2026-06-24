// api/chat.js — Vercel Serverless Function
// Proxy seguro entre el frontend Angular y la API de Gemini

const SYSTEM_INSTRUCTION = `Eres David, el asistente virtual de MovieNexus.

Tus directrices:
- Escribe con un tono profesional, amable y directo.
- Evita el uso excesivo de emojis. Usa como máximo 1 o 2 por mensaje para mantener la elegancia.
- Sé breve y preciso. Responde de forma concisa (máximo 80-120 palabras) para no abrumar al usuario con párrafos largos.
- Cuando te pidan recomendaciones, menciona brevemente las películas en 1 o 2 líneas cada una, y SIEMPRE incluye al final de tu mensaje la lista en este formato exacto:
  |||MOVIES:["Nombre Película 1","Nombre Película 2","Nombre Película 3"]|||
- Si no se piden recomendaciones, no incluyas el bloque JSON de películas.
- Mantente siempre en tu rol de asistente experto de cine de MovieNexus.`;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { history, message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Construir el historial de conversación para Gemini
  const contents = [];

  if (history && Array.isArray(history)) {
    for (const turn of history) {
      contents.push({
        role: turn.role,
        parts: [{ text: turn.text }],
      });
    }
  }

  // Agregar el mensaje actual del usuario
  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  const requestBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents: contents,
    generationConfig: {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    if (!geminiRes.ok) {
      const errData = await geminiRes.json();
      console.error('Gemini API error:', errData);
      return res.status(geminiRes.status).json({
        error: errData?.error?.message || 'Gemini API error',
      });
    }

    const data = await geminiRes.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Lo siento, no pude generar una respuesta en este momento. ¡Inténtalo de nuevo! 🎬';

    return res.status(200).json({ text });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
