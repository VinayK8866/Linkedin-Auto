import { getSetting } from './db.js';
import { cleanDraft, scoreDraft } from './humanizer.js';

export interface HookFormula {
  id: string;
  name: string;
  bestFor: string;
  template: string;
  isFounder?: boolean;
}

export const HOOK_FORMULAS: HookFormula[] = [
  {
    id: 'F7',
    name: 'Odd-Precision Money Ledger',
    bestFor: 'Founder build-logs, cost breakdowns, highest median likes in 2026',
    template: 'Start with an exact odd number ($4,120 or 1,742 users), followed by the counter-intuitive reality. Never open with a question.'
  },
  {
    id: 'F1',
    name: 'Platform Risk Anaphora',
    bestFor: 'Category/platform shifts, building resilience',
    template: 'Repeat a stark reality clause 3 times, then show what works instead.'
  },
  {
    id: 'F2',
    name: 'R.I.P. Obituary',
    bestFor: 'Era-ending claims, industry pivots',
    template: 'Declare a tired practice or outdated playbook dead, with the exact date/receipts why.'
  },
  {
    id: 'F3',
    name: 'Year-over-Year Pivot',
    bestFor: 'Identity shifts, hard-learned lessons',
    template: 'Compare where you/the market were exactly 1 year ago vs today in stark numbers.'
  },
  {
    id: 'F10',
    name: 'Contrarian + Historical Receipts',
    bestFor: 'Challenging consensus takes with data',
    template: 'State the popular belief everyone is regurgitating, then show the historical counter-example.'
  },
  {
    id: 'F17',
    name: 'Controlled A/B Anecdote (Founder Structural)',
    bestFor: 'Engineering/delegation comparisons, strategic decisions',
    template: 'Isolate one single variable between Approach A and Approach B. Show the concrete divergent outcome.'
  },
  {
    id: 'F18',
    name: 'False-Binary Dissolve (Founder Structural)',
    bestFor: 'Strategy, navigating tradeoffs',
    template: 'Everyone says choose X or Y. Both fail for the same hidden reason. Here is the third axis.'
  },
  {
    id: 'F19',
    name: 'Anecdote-Meets-Evidence Bridge (Founder Structural)',
    bestFor: 'Technical deep-dives, architectural lessons',
    template: 'A personal noticing or bug in production connected to a macro industry benchmark.'
  },
  {
    id: 'F20',
    name: 'Diverging-Curves Close (Founder Structural)',
    bestFor: 'High-conviction market predictions',
    template: 'Two trajectories that look identical in month 1 but diverge completely by month 12.'
  }
];

export const FOUNDER_ANGLES = [
  { id: 'A1', name: 'Reprice the Category', focus: 'Why standard industry pricing/assumptions are mathematically broken' },
  { id: 'A2', name: 'Content-to-Pipeline', focus: 'Real mechanics of how authority creates inbound conversations' },
  { id: 'A4', name: 'The Scarce-Shots Math', focus: 'When you only get 3 swings, how you choose which to take' },
  { id: 'A6', name: 'The Limit of Delegation', focus: 'The exact inflection point where delegating creates more technical debt' },
  { id: 'A9', name: 'The Delegation Line', focus: 'What founders must never outsource vs what to automate instantly' }
];

export const COMMENT_TEMPLATES = [
  { id: 'closing_answer', name: 'Answer the Author Closing Question', prompt: 'Directly address the question asked at the end of the post with a concrete operational experience.' },
  { id: 'counter_nuance', name: 'Add Nuance / Edge Case', prompt: 'Agree with the premise but introduce the one scenario where this rule breaks down.' },
  { id: 'real_number', name: 'Share a Specific Receipt / Metric', prompt: 'Validate their point by sharing a real percentage or duration you experienced.' },
  { id: 'structural_extension', name: 'The Next Step', prompt: 'Acknowledge the solution and point out the follow-on challenge that happens once you implement it.' }
];

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callOpenAI(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an elite LinkedIn content engineer. You write sharp, authentic, human copy without cliches or corporate slop.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callAnthropic(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: 'You are an elite LinkedIn content engineer. You write sharp, authentic, human copy without cliches or corporate slop.',
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

export async function generateWithAI(prompt: string): Promise<string> {
  const provider = getSetting<string>('aiProvider', 'gemini');
  const geminiKey = getSetting<string>('geminiApiKey', '') || process.env.GEMINI_API_KEY || '';
  const openaiKey = getSetting<string>('openaiApiKey', '') || process.env.OPENAI_API_KEY || '';
  const anthropicKey = getSetting<string>('anthropicApiKey', '') || process.env.ANTHROPIC_API_KEY || '';

  if (provider === 'gemini' && geminiKey) {
    return callGemini(geminiKey, prompt);
  } else if (provider === 'openai' && openaiKey) {
    return callOpenAI(openaiKey, prompt);
  } else if (provider === 'anthropic' && anthropicKey) {
    return callAnthropic(anthropicKey, prompt);
  }

  // Fallback checks
  if (geminiKey) return callGemini(geminiKey, prompt);
  if (openaiKey) return callOpenAI(openaiKey, prompt);
  if (anthropicKey) return callAnthropic(anthropicKey, prompt);

  throw new Error('No AI API key configured. Please add your Gemini, OpenAI, or Claude key in Dashboard Settings.');
}

export async function generatePostDraft(params: {
  topic: string;
  formulaId?: string;
  founderAngleId?: string;
  customInstructions?: string;
  targetLength?: 'short' | 'medium' | 'long';
}): Promise<{ rawDraft: string; cleanedDraft: string; audit: any }> {
  const persona = getSetting('persona', {});
  const formula = HOOK_FORMULAS.find(f => f.id === params.formulaId) || HOOK_FORMULAS[0];
  const angle = FOUNDER_ANGLES.find(a => a.id === params.founderAngleId);

  const lengthRange = params.targetLength === 'short' 
    ? '400-600 characters' 
    : params.targetLength === 'long' 
      ? '1500-1900 characters' 
      : '900-1300 characters';

  const prompt = `
Generate a high-performing, authentic LinkedIn post based on the following brief:

AUTHOR PERSONA:
- Name: ${persona.name || 'Vinay'}
- Role: ${persona.role || 'Tech Founder'}
- Industry: ${persona.industry || 'Software & AI'}
- Tone: ${(persona.toneKeywords || []).join(', ')}
- Banned Buzzwords (NEVER use these): ${(persona.bannedWords || []).join(', ')}

TOPIC: ${params.topic}
HOOK FORMULA: ${formula.name} (${formula.bestFor})
${formula.template}
${angle ? `FOUNDER ANGLE: ${angle.name} - ${angle.focus}` : ''}
${params.customInstructions ? `EXTRA INSTRUCTIONS: ${params.customInstructions}` : ''}
TARGET LENGTH: ${lengthRange}

STRICT 2026 ALGORITHM & WRITING RULES:
1. LINE 1 HOOK: Must be a crisp statement or odd-precision number. NEVER start with a question (-34% engagement penalty).
2. FIRST 210 CHARACTERS: Must hook the reader before the "...see more" fold.
3. PARAGRAPHS: 1-2 sentences maximum, separated by double line breaks. No wall of text.
4. NO CORPORATE SLOP: Zero "delve", "testament", "tapestry", "game-changer", "fast-paced world", "in today's digital era".
5. NO REVEAL BRIDGES: Never use "The result?", "Plot twist:", "Here is the thing:".
6. CLOSING: End with an insightful closing question to encourage comments (+3% lift).
7. HASHTAGS: Max 0-2 at the very bottom.
8. NO LINKS: Do not include external URLs in the post body.

Output ONLY the final LinkedIn post text.
`;

  const rawDraft = await generateWithAI(prompt);
  const cleanResult = await cleanDraft(rawDraft);
  const audit = await scoreDraft(cleanResult.text);

  return {
    rawDraft,
    cleanedDraft: cleanResult.text.trim(),
    audit
  };
}

export async function generateConnectionNote(params: {
  prospectName: string;
  headline?: string;
  company?: string;
  specificHook?: string;
}): Promise<string> {
  const persona = getSetting('persona', {});
  const prompt = `
Write a LinkedIn connection invitation note for:
- Name: ${params.prospectName}
- Headline: ${params.headline || 'Peer in tech'}
- Company: ${params.company || ''}
- Context/Hook: ${params.specificHook || 'Shared work in software architecture and engineering systems'}

MY IDENTITY:
- Name: ${persona.name || 'Vinay'}
- Role: ${persona.role || 'Tech Founder'}

STRICT CONNECTION NOTE RULES (from li-dm skill):
1. UNDER 200 CHARACTERS TOTAL. Count must be strictly under 200 chars.
2. Structure: {one specific reference to their work/post} + {one line of who you are} + {NO ASK/NO PITCH}.
3. Tone: Collegial, peer-to-peer, zero sales fluff.
4. Do NOT say "I came across your profile" or "I would love to connect".

Output ONLY the exact note text (max 200 chars).
`;

  const raw = await generateWithAI(prompt);
  const clean = await cleanDraft(raw);
  let text = clean.text.trim().replace(/^["']|["']$/g, '');
  if (text.length > 200) {
    text = text.slice(0, 197) + '...';
  }
  return text;
}

export async function generateCommentDraft(params: {
  postAuthor: string;
  postText: string;
  templateId?: string;
}): Promise<{ comment: string; audit: any }> {
  const persona = getSetting('persona', {});
  const template = COMMENT_TEMPLATES.find(t => t.id === params.templateId) || COMMENT_TEMPLATES[0];

  const prompt = `
Draft a thoughtful, high-engagement comment on this LinkedIn post:

POST AUTHOR: ${params.postAuthor}
POST CONTENT:
"""
${params.postText.slice(0, 1500)}
"""

COMMENTER IDENTITY:
- Name: ${persona.name || 'Vinay'}
- Role: ${persona.role || 'Tech Founder'}
- Tone: ${(persona.toneKeywords || []).join(', ')}

STRATEGY: ${template.name}
${template.prompt}

STRICT COMMENT RULES:
1. 150 to 300 characters. 1-2 punchy sentences.
2. NEVER say "Great post!", "Thanks for sharing!", "100% agree!", or restate what the author already said.
3. Add a concrete nuance, real-world metric, or thoughtful follow-up observation.
4. No hashtags, no sales pitch.

Output ONLY the comment text.
`;

  const raw = await generateWithAI(prompt);
  const clean = await cleanDraft(raw);
  const audit = await scoreDraft(clean.text);

  return {
    comment: clean.text.trim().replace(/^["']|["']$/g, ''),
    audit
  };
}

export async function generateCarouselSlides(params: {
  topic: string;
  numSlides?: number;
}): Promise<Array<{ slideNumber: number; headline: string; content: string; slideType: string }>> {
  const count = params.numSlides || 8;
  const prompt = `
Generate a structured LinkedIn Document Post (Carousel) breakdown for the topic: "${params.topic}".

FORMAT RULES (from li-carousel skill):
- Total slides: ${count}
- Slide 1: COVER (The hook, 6 words or fewer, big promise)
- Slide 2: THE STAKE (Why this matters in 1 sentence)
- Slide 3 to ${count - 2}: ONE IDEA PER SLIDE (Headline 3-7 words, maximum 25 words under it)
- Slide ${count - 1}: RECAP (Standalone summary list, perfect for screenshots)
- Slide ${count}: CTA (One clear action)

Return valid JSON format ONLY:
[
  { "slideNumber": 1, "slideType": "cover", "headline": "...", "content": "..." },
  ...
]
`;

  const raw = await generateWithAI(prompt);
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {}
  return [
    { slideNumber: 1, slideType: 'cover', headline: params.topic, content: 'Swipe to see the full breakdown.' }
  ];
}
