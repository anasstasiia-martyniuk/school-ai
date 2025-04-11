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

// === ENDPOINT: /check (перевірка тексту + відповідність темі) ===
app.post('/check', async (req, res) => {
  const { text: userText, level, selectedCriteria, topic } = req.body;

  if (!userText || !selectedCriteria?.length || !topic) {
    return res.status(400).json({ error: 'Tekst, criteria of onderwerp ontbreken' });
  }

  try {
    const selectedRules = grammarCriteriaText
      .split('###')
      .filter(block =>
        selectedCriteria.some(c =>
          block.toLowerCase().includes(c.toLowerCase())
        )
      )
      .join('\n');

    const messages = [
      {
        role: 'system',
        content: `Je bent een taalexpert Nederlands en examinator. Eerst controleer je of de tekst inhoudelijk aansluit bij het volgende onderwerp: "${topic}". Daarna beoordeel je de tekst volgens de beoordelingscriteria.
      
Voor het eerste deel (relevantie):
- Zeg of de tekst PAST bij het onderwerp of NIET.
- Geef kort uitleg (1-2 zinnen).

Daarna geef je voor ELK geselecteerd criterium:
1. Een score volgens het beoordelingsdocument.
2. Tips om het te verbeteren.
3. Twee voorbeelden: één goed, één met fouten (liefst uit de tekst).

Gebruik ENKEL de volgende beoordelingscriteria (niveau ${level}):

${selectedRules}
`
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
    console.log('🔁 OpenRouter result (feedback):', result);

    const reply = result.choices?.[0]?.message?.content;
    if (!reply) return res.status(500).json({ error: 'Geen feedback ontvangen' });

    res.json({ output: reply });

  } catch (err) {
    console.error('❌ API-fout (feedback):', err);
    res.status(500).json({ error: 'Interne serverfout' });
  }
});

// === ENDPOINT: /topic (генерація теми) ===
app.post('/topic', async (req, res) => {
  const { level, selectedCriteria } = req.body;

  const prompt = `
Je bent een creatieve taalcoach Nederlands. Bedenk één korte, duidelijke schrijftaak op niveau ${level}. De schrijftaak moet passen bij de volgende criteria: ${selectedCriteria.join(', ')}. 
Voorbeelden:
- Een brief of e-mail schrijven (bijvoorbeeld naar een docent, stageplek, school of voor
een sollicitatie).
- Een persoonlijke tekst schrijven (bijvoorbeeld een brief naar familie of vrienden, of iets
vertellen over je werk, school of stage).
- Een klacht of probleem opschrijven (bijvoorbeeld een klachtenbrief maken of een
klachtenformulier invullen).
- Een uitnodiging of oproep maken (bijvoorbeeld voor een feest, excursie, open dag of
protest).
- Een formulier invullen (bijvoorbeeld om je in te schrijven voor een stage, sportclub of
opleiding).

Kan NIET alleen over vakantie en weekend! Onderwerp hoeven niet telkens herhaald te worden.! 
Onderwerpen moeten verschillende.

Geef alleen de taak zelf, zonder uitleg. 
Als het onderwerp niet klopt, analyseer de tekst van student dan nog steeds volgens de criteria.Besteed geen aandacht aan het hoofdonderwerp, maar op het onderwerp van de student.
`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8
      })
    });

    const data = await response.json();
    console.log('📚 OpenRouter result (topic):', data);

    const topic = data.choices?.[0]?.message?.content?.trim();
    if (!topic) return res.status(500).json({ error: "Geen thema ontvangen" });

    res.json({ topic });

  } catch (err) {
    console.error("❌ Thema API-fout:", err);
    res.status(500).json({ error: "Interne fout bij thema-generatie" });
  }
});

// === Запуск ===
app.listen(PORT, () => {
  console.log(`🚀 Server draait op http://localhost:${PORT}`);
});
