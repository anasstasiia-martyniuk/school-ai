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

// Serve static files from public folder
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

// API endpoint
app.post('/check', async (req, res) => {
  const { text: userText, level, selectedCriteria } = req.body;

  if (!userText || !selectedCriteria?.length) {
    return res.status(400).json({ error: 'Tekst of criteria ontbreken' });
  }

  try {
    // Фільтруємо потрібні критерії з файла
    const selectedRules = grammarCriteriaText
      .split('###') // Розділювач між критеріями в grammar_rules.txt
      .filter(block =>
        selectedCriteria.some(c =>
          block.toLowerCase().includes(c.toLowerCase())
        )
      )
      .join('\n');

    // Формуємо prompt
    const messages = [
      {
        role: 'system',
        content: `Je bent een taalexpert Nederlands. Gebruik ALLEEN de onderstaande beoordelingscriteria op niveau ${level}. Geef duidelijke, gestructureerde feedback voor ELK geselecteerd criterium.

${selectedRules}

Voor elke geselecteerde criterium geef je:
1. De score volgens het beoordelingsdocument.
2. Tips om het te verbeteren.
3. Twee concrete voorbeelden: één goed, één die verbetering nodig heeft (bij voorkeur uit de tekst).

Geef GEEN feedback over andere criteria.`
      },
      {
        role: 'user',
        content: `Hier is mijn tekst:\n\n${userText}`
      }
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
console.log('🔁 OpenRouter result:', result);

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
