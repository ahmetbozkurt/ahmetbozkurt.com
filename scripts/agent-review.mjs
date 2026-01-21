#!/usr/bin/env node
// Multi-agent review script: generates a PR body with role-based reviews
// Roles: Developer, Project Manager, Tester, Reviewer, Security

import fs from 'fs/promises';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const META_PATH = path.join(ROOT, '.agent', 'last.json');
const PR_BODY = path.join(ROOT, 'AGENT_PR_BODY.md');

async function readMeta() {
  const raw = await fs.readFile(META_PATH, 'utf8');
  return JSON.parse(raw);
}

async function readPost(file) {
  const full = path.join(ROOT, file);
  return fs.readFile(full, 'utf8');
}

function extractFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const yaml = m[1];
  const obj = {};
  yaml.split(/\r?\n/).forEach((line) => {
    const i = line.indexOf(':');
    if (i > -1) {
      const key = line.slice(0, i).trim();
      const val = line.slice(i + 1).trim().replace(/^"|"$/g, '');
      obj[key] = val;
    }
  });
  return obj;
}

function systemPrompt(topic, lang) {
  const language = lang || 'tr';
  return (
    `You are a panel of experts producing concise, actionable reviews in ${language}.\n` +
    `Return markdown with sections for Developer, Project Manager, Tester, Reviewer, Security.\n` +
    `Each section: 3-6 bullet points, concrete and pragmatic, referencing the article content.\n` +
    `Focus on technical accuracy, SDLC clarity, governance, risks, and improvement suggestions.\n`
  );
}

async function callCustomAgent({ topic, lang, content }) {
  const url = process.env.AGENT_URL;
  if (!url) return null;
  const headers = { 'Content-Type': 'application/json' };
  const key = process.env.AGENT_API_KEY;
  if (key) headers['Authorization'] = `Bearer ${key}`;
  const body = {
    intent: 'astro_blog_multi_agent_review',
    language: lang || 'tr',
    topic,
    content,
    instructions: systemPrompt(topic, lang),
  };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Custom agent request failed: ${res.status} ${res.statusText} ${txt}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const json = await res.json();
    return json.content || json.text || json.output || JSON.stringify(json, null, 2);
  }
  return await res.text();
}

async function callOpenAI({ topic, lang, content }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt(topic, lang) },
        { role: 'user', content: `Review this article in role-based sections:\n\n${content}` },
      ],
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`OpenAI request failed: ${res.status} ${res.statusText} ${txt}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content || null;
}

function fallbackReviews(lang) {
  const isTR = (lang || 'tr').toLowerCase().startsWith('tr');
  if (isTR) {
    return `### Developer\n- Kod örnekleri çalıştırılabilir ve minimal olmalı.\n- Script parametreleri README'de örneklendirilmeli.\n- Hata mesajları eyleme dönük olmalı.\n- Hero görsel yolları Astro image() ile uyumlu olmalı.\n\n### Project Manager\n- İş akışı manuel ve zamanlanmış tetikleme içeriyor.\n- PR inceleme zorunlu; yayınlama ayrı adım olmalı.\n- Konu tanımı ve kabul kriterleri netleştirilmeli.\n- Takvim: haftalık üretim + aylık tema derlemesi.\n\n### Tester\n- İçerik şema doğrulaması (astro build) zorunlu.\n- Kırık link ve görsel kontrol adımı eklenmeli.\n- Komutlar Windows/Linux örnekleri ile test edilmeli.\n- Başlık/slug tekrar çakışmaları ele alınmalı.\n\n### Reviewer\n- Kaynak ve atıflar kontrol edilmeli.\n- Ton ve tutarlılık şablonu uygulanmalı.\n- Büyük değişiklikler için taslak/geri bildirim turu.\n- PR açıklaması özet + maddeler içermeli.\n\n### Security\n- Secrets sadece Actions Secrets içinde tutulmalı.\n- Agent isteklerinde oran sınırlama/kayıt tutma gerekli.\n- İçerik sızıntısı ve telif riski not edilmeli.\n- Bağımlılıklar güvenlik güncellemeleriyle takip edilmeli.`;
  }
  return `### Developer\n- Ensure runnable, minimal code samples.\n- Document script parameters with examples.\n- Provide actionable error messages.\n- Use Astro image() compatible hero paths.\n\n### Project Manager\n- Manual and scheduled triggers are included.\n- PR review mandatory; publishing should be separate.\n- Clarify topic definition and acceptance criteria.\n- Cadence: weekly generation + monthly theme review.\n\n### Tester\n- Enforce schema validation via astro build.\n- Add broken link and image checks.\n- Test commands for Windows/Linux shells.\n- Handle duplicate title/slug collisions.\n\n### Reviewer\n- Verify sources and citations.\n- Apply tone and style templates.\n- Run a draft/feedback round for big edits.\n- PR description should include summary + bullets.\n\n### Security\n- Keep secrets only in Actions Secrets.\n- Add rate limiting and request logging.\n- Note data leakage and copyright risks.\n- Track dependency security updates.`;
}

async function main() {
  const meta = await readMeta();
  const md = await readPost(meta.file);
  const fm = extractFrontmatter(md);
  const topic = meta.title || fm.title || meta.slug;
  const lang = meta.lang || 'tr';

  let reviews = null;
  try {
    reviews = await callCustomAgent({ topic, lang, content: md });
  } catch (e) {
    console.warn(`[agent-review] Custom agent error: ${e.message}`);
  }
  if (!reviews) {
    try {
      reviews = await callOpenAI({ topic, lang, content: md });
    } catch (e) {
      console.warn(`[agent-review] OpenAI fallback error: ${e.message}`);
    }
  }
  if (!reviews) reviews = fallbackReviews(lang);

  const pr = `# Agent-generated blog post\n\n- Topic: ${topic}\n- Lang: ${lang}\n- File: ${meta.file}\n\n## Multi-Agent Reviews\n\n${reviews}\n\n## Checklist\n- [ ] Content matches topic and audience\n- [ ] Links/images render correctly\n- [ ] No secrets or sensitive data\n- [ ] Approvals from reviewer/security obtained\n`;

  await fs.writeFile(PR_BODY, pr, 'utf8');
  console.log(`Wrote PR body: ${path.relative(ROOT, PR_BODY)}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
