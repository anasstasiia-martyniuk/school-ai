import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Слухай папку public
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

let grammarCriteriaText = '';

async function loadRules() {
  try {
    grammarCriteriaText = await fs.readFile(path.join(__dirname, 'grammar_rules.txt'), 'utf-8');
    console.log('✅ Grammar rules loaded');
  } catch (e) {
    console.error('❌ Failed to load grammar_rules.txt');
  }
}
await loadRules();

app.post('/check', async (req, res) => {
  const userText = req.body.text;
  if (!userText) return res.status(400).json({ error: 'Geen tekst ontvangen' });

  try {
    const messages = [
      { role: 'system', content: `Je bent een taalexpert Nederlands. Gebruik de volgende beoordelingscriteria en geef duidelijke feedback per onderdeel:

${grammarCriteriaText}

Voor elk criterium geef je:
• Score
• Tips
• 2 concrete voorbeelden` },
      { role: 'user', content: userText }
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages,
        temperature: 0.7
      })
    });

    const result = await response.json();

    const reply = result.choices?.[0]?.message?.content;
    if (!reply) return res.status(500).json({ error: 'Geen feedback ontvangen' });

    res.json({ output: reply });
  } catch (err) {
    console.error('❌ API-fout:', err);
    res.status(500).json({ error: 'Interne serverfout' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server draait op http://localhost:${PORT}`);
});
