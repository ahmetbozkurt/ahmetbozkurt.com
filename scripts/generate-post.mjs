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
  const isSDLC = topic.toLowerCase().includes('sdlc') || topic.toLowerCase().includes('github') || topic.toLowerCase().includes('agent');
  if (isSDLC) {
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
  return (
    `You are an expert technical writer and thought leader.\n` +
    `Write a comprehensive, engaging blog post in ${language} for an Astro site about:\n` +
    `"${topic}".\n\n` +
    `Requirements:\n` +
    `- Provide original insights, examples, and practical takeaways.\n` +
    `- Use clear headings (##, ###) to structure the content.\n` +
    `- Include at least one real-world example or case study.\n` +
    `- Keep formatting as Markdown only (no frontmatter or code fences for frontmatter).\n` +
    `- Write in a professional but accessible tone.`
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
  const lowerTopic = topic.toLowerCase();
  
  // Quantum
  if (lowerTopic.includes('quantum')) {
    return isTR 
      ? `# ${topic}\n\nKuantum bilgisayarlar, klasik bilgisayarlardan tamamen farklı çalışan ve gelecek teknolojisinin temelini oluşturacak cihazlardır.\n\n## Kuantum Bilgisayarlar Nedir?\n\nKuantum bilgisayarlar, kuantum mekaniğinin ilkelerini kullanarak hesaplamalar yapan bilgisayarlardır. Klasik bilgisayarlar 0 ve 1 (bit) kullanırken, kuantum bilgisayarlar kubit (quantum bit) kullanır. Kubit hem 0 hem 1 durumunda olabilir (süperpozisyon).\n\n## Temel Kavramlar\n\n### Süperpozisyon\nKubitlerin birden fazla durumda eşzamanlı olarak bulunması.\n\n### Dolanıklık (Entanglement)\nKubitlerin birbirleriyle ilişkili olmalarıyla, bir kubitin durumu diğerini etkilemesi.\n\n### Girişim (Interference)\nDoğru cevapları amplify etme ve yanlış cevapları iptal etme.\n\n## Pratik Uygulamalar\n\n- Şifreleme ve güvenlik\n- İlaç geliştirme\n- Finansal modelleme\n- Optimizasyon problemleri\n- Yapay zeka ve makine öğrenmesi\n\n## Günümüz Durumu\n\nGoogle, IBM, Microsoft gibi büyük şirketler kuantum bilgisayarlar üzerinde çalışmaktadır. 2020'lerden itibaren NISQ (Noisy Intermediate-Scale Quantum) dönemine girilmiştir.\n\n## Zorluklar\n\n- Dekoherans: Kubitlerin çevresel müdahalelerden hızlı bozulması\n- Hata oranları: Yüksek hata oranlarına karşı hata düzeltme ihtiyacı\n- Ölçeklenebilirlik: Binlerce kubit içeren sistemler geliştirme\n\n## Sonuç\n\nKuantum bilgisayarlar henüz erken aşamada olsa da, geleceğin teknoloji mimarisinde devrim yaratması beklenmektedir.`
      : `# ${topic}\n\nQuantum computers represent a fundamental shift from classical computing, leveraging the principles of quantum mechanics.\n\n## What are Quantum Computers?\n\nQuantum computers use quantum bits (qubits) instead of classical bits. While classical bits are either 0 or 1, qubits can exist in superposition—both states simultaneously.\n\n## Key Principles\n\n### Superposition\nQubits can exist in multiple states at once, dramatically expanding computational possibilities.\n\n### Entanglement\nQubits can be correlated, where the state of one qubit depends on another.\n\n### Interference\nAmplifying correct answers and canceling incorrect ones through quantum interference patterns.\n\n## Real-World Applications\n\n- Cryptography and security\n- Drug discovery and molecular simulation\n- Financial modeling and optimization\n- Machine learning\n- Climate simulation\n\n## Current Status\n\nMajor tech companies (Google, IBM, Microsoft) are advancing quantum computing. We're in the NISQ (Noisy Intermediate-Scale Quantum) era.\n\n## Challenges Ahead\n\n- Decoherence: Qubits lose information due to environmental interference\n- Error rates: Developing robust error correction\n- Scalability: Building systems with thousands of qubits\n\n## The Future\n\nQuantum computers promise to revolutionize industries that depend on complex problem-solving and simulation.`;
  }
  
  // Security
  if (lowerTopic.includes('security') || lowerTopic.includes('güvenlik')) {
    return isTR
      ? `# ${topic}\n\nSiber güvenlik, dijital varlıkları ve bilgileri kötü niyetli saldırılardan koruyan disiplindir.\n\n## Temel Tehditleri\n\n### Malware\nKötü amaçlı yazılımlar: virüsler, solucanlar, trojalar.\n\n### Phishing\nSosyal mühendislikle kullanıcıları kandırarak kimlik bilgileri elde etme.\n\n### DDoS Saldırıları\nHizmetleri kesintiye uğratmak için aşırı trafik gönderme.\n\n### SQL Injection\nVeritabanı sorgularına kötü amaçlı kod enjekte etme.\n\n## Koruma Stratejileri\n\n- Güçlü şifreler ve çok faktörlü kimlik doğrulama\n- Düzenli yazılım güncellemeleri\n- Çalışan eğitimi ve farkındalık\n- Güvenlik duvarları ve IDS/IPS sistemleri\n- Veri şifreleme\n- Düzenli güvenlik denetimleri\n\n## Uyum ve Standartlar\n\n- GDPR: Veri koruma yönetmeliği\n- ISO 27001: Bilgi güvenliği yönetimi\n- HIPAA: Sağlık verileri koruması\n- PCI-DSS: Ödeme kartı endüstrisinin standartları\n\n## Sonuç\n\nGüvenlik, sürekli uyum ve teşvik gerektiren bir süreçtir. Proaktif ve reaktif stratejilerin kombinasyonu gereklidir.`
      : `# ${topic}\n\nCybersecurity is the practice of protecting digital assets, networks, and information systems from malicious attacks.\n\n## Common Threats\n\n### Malware\nMalicious software including viruses, worms, and trojans.\n\n### Phishing\nSocial engineering attacks to steal credentials and sensitive information.\n\n### DDoS Attacks\nFlooding systems with traffic to cause service disruption.\n\n### Injection Attacks\nInserting malicious code into data queries or inputs.\n\n## Defense Mechanisms\n\n- Strong authentication and multi-factor verification\n- Regular security updates and patching\n- Employee training and awareness\n- Firewalls and intrusion detection systems\n- Data encryption\n- Penetration testing and security audits\n\n## Compliance Frameworks\n\n- GDPR: Data protection regulation\n- ISO 27001: Information security management\n- HIPAA: Healthcare data protection\n- PCI-DSS: Payment card industry standards\n\n## Conclusion\n\nCybersecurity requires continuous learning, adaptation, and a layered defense strategy.`;
  }
  
  // AI/LLM
  if (lowerTopic.includes('ai') || lowerTopic.includes('yapay zeka') || lowerTopic.includes('llm')) {
    return isTR
      ? `# ${topic}\n\nYapay zeka, makinaları insana benzer şekilde düşünmeye ve karar almaya programlama bilimi ve teknolojisidir.\n\n## Yapay Zeka Türleri\n\n### Dar AI (Weak AI)\nBelirli görevlerde uzmanlaşmış yapay zeka. Günümüzde kullanılan tüm sistemler bu kategoriye girer.\n\n### Genel AI (Strong AI)\nİnsan seviyesinde zeka ve çok yönlü problemler çözebilen yapay zeka. Henüz gerçekleşmemiştir.\n\n## Makine Öğrenmesi Temelleri\n\n- **Süpervised Learning**: Etiketlenmiş verilerle öğrenme\n- **Unsupervised Learning**: Desenleri kendiliğinden bulma\n- **Reinforcement Learning**: Geri bildirime dayalı öğrenme\n\n## Derin Öğrenme ve Sinir Ağları\n\nDerin sinir ağları, çok katmanlı yapılarıyla karmaşık desenleri öğrenebilir. Görüntü tanıma, doğal dil işleme ve ses tanımada devrim yaratmıştır.\n\n## Büyük Dil Modelleri (LLM)\n\nTransformer mimarisine dayalı modeller (GPT, Claude, Gemini), milyarlarca parametreyle eğitilmiş ve insan dilini anlamada olağanüstü başarı göstermektedir.\n\n## Etik ve Sorunlar\n\n- Önyargı ve adalet\n- Şeffaflık ve açıklanabilirlik\n- Veri gizliliği\n- İstihdam etkisi\n- Küresel kontrol ve yönetişim\n\n## Gelecek\n\nAI, sağlık, eğitim, ulaşım, enerji gibi birçok sektörü dönüştürecek.`
      : `# ${topic}\n\nArtificial Intelligence represents the frontier of computing, enabling machines to learn, reason, and make decisions.\n\n## Types of AI\n\n### Narrow AI\nSpecialized AI systems designed for specific tasks. All current AI falls into this category.\n\n### General AI\nHypothetical AI with human-level intelligence across diverse domains. Not yet achieved.\n\n## Machine Learning Foundations\n\n- **Supervised Learning**: Learning from labeled data\n- **Unsupervised Learning**: Finding patterns autonomously\n- **Reinforcement Learning**: Learning through rewards and penalties\n\n## Deep Learning and Neural Networks\n\nMulti-layered neural networks have revolutionized computer vision, natural language processing, and speech recognition.\n\n## Large Language Models (LLMs)\n\nTransformer-based models trained on billions of parameters demonstrate remarkable capability in understanding and generating human language.\n\n## Ethical Considerations\n\n- Bias and fairness\n- Transparency and explainability\n- Data privacy\n- Job displacement\n- Global governance\n\n## The Path Ahead\n\nAI will transform healthcare, education, transportation, energy, and countless other industries.`;
  }
  
  // Default: Dev/Tech
  const isTech = lowerTopic.includes('dev') || lowerTopic.includes('code') || lowerTopic.includes('program');
  if (isTech) {
    return isTR
      ? `# ${topic}\n\nSoftware geliştirme, tasarımdan dağıtıma kadar tüm süreci kapsar ve iyi uygulamalar gerektirir.\n\n## Yazılım Geliştirme Yaşam Döngüsü (SDLC)\n\n### Planlama\nGereksinimler tanımlama ve tasarım.\n\n### Tasarım\nSistem mimarisi ve teknik detaylar.\n\n### Geliştirme\nKod yazma ve modüler tasarım.\n\n### Test\nBirim testleri, entegrasyon testleri, sistem testleri.\n\n### Dağıtım\nProduction ortamına geçiş.\n\n### Bakım\nBugs düzeltme ve features ekleme.\n\n## En İyi Uygulamalar\n\n- Version control (Git)\n- Code review ve collaboration\n- Continuous Integration/Deployment (CI/CD)\n- Automated testing\n- Documentation\n- Security-first approach\n\n## Popüler Teknolojiler\n\n- Backend: Node.js, Python, Go, Java\n- Frontend: React, Vue, Angular\n- Database: PostgreSQL, MongoDB, Redis\n- DevOps: Docker, Kubernetes, Terraform\n\n## Sonuç\n\nBaşarılı yazılım geliştirme, teknik yetkinlik, iş düşünüşü ve işbirliğinin kombinasyonu gerektirir.`
      : `# ${topic}\n\nSoftware development is both an art and a science, requiring careful planning, execution, and iteration.\n\n## The Software Development Lifecycle\n\n### Requirements\nGather and define what needs to be built.\n\n### Design\nArchitect the system and technical approach.\n\n### Development\nWrite clean, maintainable code.\n\n### Testing\nEnsure quality through comprehensive testing.\n\n### Deployment\nRelease to production safely.\n\n### Maintenance\nSupport, fix bugs, and add features.\n\n## Best Practices\n\n- Use version control systems\n- Conduct code reviews\n- Implement CI/CD pipelines\n- Write automated tests\n- Document thoroughly\n- Follow security principles\n\n## Modern Tech Stack\n\n- Backend: Node.js, Python, Go, Java\n- Frontend: React, Vue, Angular\n- Databases: PostgreSQL, MongoDB, Redis\n- DevOps: Docker, Kubernetes, Terraform\n\n## Success Factors\n\nEffective communication, clear requirements, automated testing, and continuous improvement drive successful projects.`;
  }
  
  // Fallback: Generic
  return isTR
    ? `# ${topic}\n\n${topic} hakkında derinlemesine bir inceleme.\n\n## Giriş\n\nBu yazı, ${topic} konusunun önemli yönlerini ve pratik uygulamalarını incelemektedir.\n\n## Temel Kavramlar\n\nKonunun temeli, tarihsel gelişimi ve günümüz önemi.\n\n## Pratik Uygulamalar\n\n${topic} konusu çeşitli sektörlerde ve kullanım durumlarında yer almaktadır.\n\n## Zorluklar ve Fırsatlar\n\nBu alanda karşılaşılan engelleri ve gelecekteki potansiyeli analiz etmek önemlidir.\n\n## Sonuç\n\n${topic}, sürekli gelişen bir alan olup, profesyonelerin güncel kalması ve yenilikleri takip etmesi gerekmektedir.`
    : `# ${topic}\n\nAn in-depth exploration of ${topic} and its significance.\n\n## Introduction\n\nThis article examines the key aspects and practical applications of ${topic}.\n\n## Core Concepts\n\nUnderstanding the fundamentals, historical context, and contemporary relevance.\n\n## Practical Applications\n\n${topic} plays important roles across various industries and use cases.\n\n## Challenges and Opportunities\n\nAnalyzing both obstacles and future potential in this domain.\n\n## Conclusion\n\n${topic} remains an evolving field requiring professionals to stay current and embrace innovation.`;
}

async function main() {
  const args = parseArgs(process.argv);
  const topic = args.topic || process.env.TOPIC || 'Custom Agent ile Astro Blog Üretimi: SDLC ve GitHub Süreci';
  const lang = args.lang || process.env.LANG || 'tr';
  const inputSlug = args.slug || process.env.SLUG || '';

  const date = todayISO();
  // Slug: use input, or title-based slug with date prefix
  // Remove date prefix if slug alone is meaningful enough
  const titleSlug = slugify(topic);
  const baseSlug = inputSlug || (titleSlug.length > 20 ? titleSlug : `${date}-${titleSlug}`);
  const title = topic;
  // Description: use provided, or derive from topic intelligently
  const defaultDesc = args.description || topic.slice(0, 180);
  const description = defaultDesc.slice(0, 180);
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
