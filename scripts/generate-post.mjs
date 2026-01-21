#!/usr/bin/env node
// Minimal agent-driven Astro blog generator
// - Uses a custom agent via HTTP (AGENT_URL/AGENT_API_KEY)
// - Falls back to OpenAI if OPENAI_API_KEY is available
// - Finally falls back to a local structured template

import fs from 'fs/promises';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const BLOG_DIR = path.join(ROOT, 'src', 'content', 'blog');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [key, ...rest] = a.replace(/^--/, '').split('=');
      const val = rest.length ? rest.join('=') : argv[i + 1]?.startsWith('--') ? '' : argv[++i];
      args[key] = val ?? '';
    }
  }
  return args;
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

function todayISO() {
  const d = new Date();
  // Use local date without time in ISO YYYY-MM-DD
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function uniqueFilePath(dir, baseSlug) {
  let attempt = 0;
  while (true) {
    const name = attempt === 0 ? `${baseSlug}.md` : `${baseSlug}-${attempt}.md`;
    const full = path.join(dir, name);
    try {
      await fs.access(full);
      attempt++;
    } catch {
      return full;
    }
  }
}

function yamlQuote(value) {
  if (value == null) return '';
  const s = String(value)
    .replace(/"/g, '\\"');
  return `"${s}"`;
}

function buildFrontmatter({ title, description, pubDate, heroImage }) {
  return `---\n` +
    `title: ${yamlQuote(title)}\n` +
    `description: ${yamlQuote(description)}\n` +
    `pubDate: ${yamlQuote(pubDate)}\n` +
    (heroImage ? `heroImage: ${yamlQuote(heroImage)}\n` : '') +
    `---\n\n`;
}

function systemPrompt({ topic, lang }) {
  const language = lang || 'tr';
  // Keep it generic; agent decides structure and depth
  return (
    `You are a senior DevOps + SDLC engineer and technical writer.\n` +
    `Write a comprehensive blog post in ${language} for an Astro site about:\n` +
    `"${topic}".\n\n` +
    `Requirements:\n` +
    `- Focus on SDLC and GitHub-based process to generate Astro blog posts with a custom agent.\n` +
    `- Include a clear workflow (planning, prompting, generation, validation, review, publish).\n` +
    `- Provide at least one GitHub Actions YAML example and explain each step.\n` +
    `- Provide minimal code snippets for generator scripts and frontmatter.\n` +
    `- Include security and governance considerations (secrets, PR reviews, rate limiting).\n` +
    `- Keep formatting as Markdown only (no frontmatter).`
  );
}

async function callCustomAgent({ topic, lang }) {
  const url = process.env.AGENT_URL;
  if (!url) return null;
  const headers = { 'Content-Type': 'application/json' };
  const key = process.env.AGENT_API_KEY;
  if (key) headers['Authorization'] = `Bearer ${key}`;

  const body = {
    topic,
    language: lang || 'tr',
    intent: 'astro_blog_post',
    instructions: systemPrompt({ topic, lang }),
  };

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Custom agent request failed: ${res.status} ${res.statusText} ${txt}`);
  }
  // Try JSON then text
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const json = await res.json();
    // Heuristics: look for content-like fields
    return json.content || json.text || json.output || JSON.stringify(json, null, 2);
  }
  return await res.text();
}

async function callOpenAI({ topic, lang }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful technical writer.' },
        { role: 'user', content: systemPrompt({ topic, lang }) },
      ],
      temperature: 0.5,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`OpenAI request failed: ${res.status} ${res.statusText} ${txt}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content || null;
}

function localTemplate({ topic, lang }) {
  const language = (lang || 'tr').toLowerCase();
  const isTR = language.startsWith('tr');
  if (isTR) {
    return `# ${topic}\n\n` +
      `Bu yazı, özel bir ajan (custom agent) kullanarak Astro tabanlı bir blog sitesine otomatik içerik üreten SDLC + GitHub Actions sürecini açıklar.\n\n` +
      `## Hedef\n- Konu planlama ve yönetişim\n- Ajan ile içerik üretimi\n- Doğrulama (şema, link, kalite)\n- PR açma, review ve publish\n\n` +
      `## Mimari\n- Custom Agent: HTTP endpoint veya MCP tabanlı servis\n- Workflow: GitHub Actions ile zamanlı/manuel tetikleme\n- Script: İçerik üretip src/content/blog altına MD dosyası yazar\n\n` +
      `## Örnek İş Akışı (Özet)\n1. Konu ve parametreler girilir (workflow_dispatch).\n2. Script, ajana istek atar; içerik döner.\n3. Frontmatter ile birleştirilir ve dosya oluşturulur.\n4. Astro build ile şema doğrulanır.\n5. PR açılır, inceleme sonrası merge edilir.\n\n` +
      `## Güvenlik\n- Secrets: OPENAI_API_KEY / AGENT_API_KEY GitHub Secrets içinde tutulur.\n- Rate limiting ve token kullanımına dikkat edilir.\n- İçerik denetimi ve PR review zorunludur.\n\n` +
      `Devamı için repository'deki workflow ve script dosyalarına bakın.`;
  }
  return `# ${topic}\n\nThis post explains an SDLC + GitHub Actions process to generate Astro blog content using a custom agent.\n\n- Planning and governance\n- Agent-driven content generation\n- Validation (schema, links, quality)\n- PR, review, publish\n\nCheck the repository workflow and script for details.`;
}

async function main() {
  const args = parseArgs(process.argv);
  const topic = args.topic || process.env.TOPIC || 'Custom Agent ile Astro Blog Üretimi: SDLC ve GitHub Süreci';
  const lang = args.lang || process.env.LANG || 'tr';
  const inputSlug = args.slug || process.env.SLUG || '';

  const date = todayISO();
  const baseSlug = inputSlug || `${date}-${slugify(topic)}`;
  const title = topic;
  const description = (args.description || `Custom agent ile Astro blog üretimi için SDLC + GitHub iş akışı`).slice(0, 180);
  const pubDate = `${date}`;
  const heroImage = '../../assets/blog-placeholder-2.jpg';

  await ensureDir(BLOG_DIR);
  const filePath = await uniqueFilePath(BLOG_DIR, baseSlug);

  let body = null;
  try {
    body = await callCustomAgent({ topic, lang });
  } catch (e) {
    console.warn(`[agent] Custom agent error: ${e.message}`);
  }
  if (!body) {
    try {
      body = await callOpenAI({ topic, lang });
    } catch (e) {
      console.warn(`[agent] OpenAI fallback error: ${e.message}`);
    }
  }
  if (!body) {
    body = localTemplate({ topic, lang });
  }

  const frontmatter = buildFrontmatter({ title, description, pubDate, heroImage });
  const content = `${frontmatter}${body}\n`;

  await fs.writeFile(filePath, content, 'utf8');
  console.log(`Generated: ${path.relative(ROOT, filePath)}`);
  // Persist metadata for downstream steps (e.g., multi-agent review)
  const metaDir = path.join(ROOT, '.agent');
  await fs.mkdir(metaDir, { recursive: true });
  const meta = {
    file: path.relative(ROOT, filePath).replace(/\\/g, '/'),
    slug: path.basename(filePath, path.extname(filePath)),
    title,
    lang,
    date,
  };
  await fs.writeFile(path.join(metaDir, 'last.json'), JSON.stringify(meta, null, 2), 'utf8');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
