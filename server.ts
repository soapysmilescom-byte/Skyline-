/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));

const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  try {
    ai = new GoogleGenAI({ apiKey: geminiApiKey });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI with key:', err);
  }
}

// 1. Generate Custom 1st Birthday Verse
app.post('/api/gemini/generate-verse', async (req, res) => {
  const { name = 'Baby', age = 1, gender = 'girl', theme = 'jungle_safari' } = req.body;

  if (ai) {
    try {
      const prompt = `Write a charming, sweet, and rhyming 2-sentence 1st birthday invitation poem for a ${gender === 'boy' ? 'baby boy' : 'baby girl'} named ${name} who is turning ${age}. Theme: ${theme}. Return JSON with: {"verse": "...", "subline": "..."}`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text?.trim();
      if (text) {
        const parsed = JSON.parse(text);
        return res.json({
          verse: parsed.verse,
          subline: parsed.subline || `With love, we invite you to celebrate our little ${gender === 'boy' ? 'prince' : 'princess'}'s special day`,
        });
      }
    } catch (err) {
      console.warn('Gemini generate-verse error:', err);
    }
  }

  // Graceful fallback
  const fallbackVerses: Record<string, string> = {
    jungle_safari: `Roar! Grab your safari hat and join ${name}'s wild 1st birthday party in the jungle! A year of sweet giggles, wonder, and endless joy.`,
    fairytale_pink: `All aboard the magical birthday train! A year of sweet giggles, wonder, and endless joy for our little princess ${name}!`,
    royal_blue: `Our little royal adventurer ${name} is turning ONE! Join us for a royal celebration under golden stars.`,
    cosmic_space: `3... 2... 1... Blast off! Our little cosmic star ${name} is celebrating their first trip around the sun!`,
    under_sea: `Splashing into year number one! Seashells, bubbles, and ocean fun with our darling ${name}!`,
    teddy_clouds: `Floating among soft pastel clouds and teddy bear dreams to celebrate our sweetest angel ${name} turning ONE!`,
    unicorn_rainbow: `Over the rainbow and past the stars, our little unicorn princess ${name} turns ONE!`,
    racing_champion: `Green flag is waving, tires are spinning fast! ${name} is turning ONE with trophies and a blast!`,
  };

  const verse = fallbackVerses[theme] || `All aboard the celebration express! Sweet dreams and giggles we confess, as our precious ${name} turns ONE today!`;
  return res.json({
    verse,
    subline: `With love, we invite you to celebrate our little ${gender === 'boy' ? 'prince' : 'princess'}'s special day`,
  });
});

// 2. Generate Baby Script Suggestions
app.post('/api/gemini/generate-baby-script', async (req, res) => {
  const { name = 'Baby', age = 1, expression = 'cheerful', gender = 'girl' } = req.body;

  if (ai) {
    try {
      const prompt = `Generate 3 short, adorable toddler speaking lines for a 1-year-old child named ${name} (${gender}) speaking to invited guests for their 1st birthday party video. Mood: ${expression}. Include cute toddler words like 'Goo goo gaga', 'Choo-choo', 'Yummy cake', 'Hug me'. Return JSON: {"scripts": ["line 1", "line 2", "line 3"]}`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text?.trim();
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.scripts && Array.isArray(parsed.scripts)) {
          return res.json({ scripts: parsed.scripts });
        }
      }
    } catch (err) {
      console.warn('Gemini generate-baby-script error:', err);
    }
  }

  // Fallback scripts
  const fallbackScripts = [
    `Goo goo gaga! Choo-choo! Welcome to my 1st Birthday party! Come eat cake with me and dance all day!`,
    `Hi everyone! Look at me, I am turning ONE! Come to my party and let's play with balloons!`,
    `Thank you for loving me! Put on your party hat and give conductor ${name} a big birthday hug!`,
  ];
  return res.json({ scripts: fallbackScripts });
});

// 3. Generate Baby Voice Audio
app.post('/api/gemini/generate-baby-voice', async (req, res) => {
  const { script } = req.body;

  // If Gemini multimodal voice is supported, can generate audio
  // Here we return { success: false, fallbackToLocal: true } so the client executes its
  // high-definition Web Audio formant & oscillator baby synthesizer
  return res.json({
    success: false,
    fallbackToLocal: true,
    message: 'Client-side HD formant synthesizer configured for baby speech.',
  });
});

// Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PixelBridge Studio 3D server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
