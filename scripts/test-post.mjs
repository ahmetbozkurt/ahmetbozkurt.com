#!/usr/bin/env node
// Test script for generated blog posts
// Validates: frontmatter, links, images, content quality

import fs from 'fs/promises';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const META_PATH = path.join(ROOT, '.agent', 'last.json');
const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'blog');

async function readMeta() {
  try {
    const raw = await fs.readFile(META_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    throw new Error(`.agent/last.json not found. Run generate:post first.`);
  }
}

async function readPost(file) {
  const full = path.join(ROOT, file);
  return fs.readFile(full, 'utf8');
}

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error('Invalid frontmatter: missing --- delimiters');
  const fm = m[1];
  const obj = {};
  const errors = [];
  fm.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      errors.push(`Line ${i + 1}: No colon found: "${line}"`);
      return;
    }
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim().replace(/^"|"$/g, '');
    obj[key] = val;
  });
  if (errors.length) throw new Error(`Frontmatter parse errors:\n${errors.join('\n')}`);
  return obj;
}

function validateFrontmatter(fm) {
  const required = ['title', 'description', 'pubDate'];
  const errors = [];
  required.forEach((key) => {
    if (!fm[key]) errors.push(`Missing required field: ${key}`);
  });
  if (fm.title && fm.title.length < 3) errors.push(`Title too short (min 3 chars): "${fm.title}"`);
  if (fm.description && fm.description.length < 10) errors.push(`Description too short (min 10 chars): "${fm.description}"`);
  if (fm.pubDate && !/^\d{4}-\d{2}-\d{2}/.test(fm.pubDate)) {
    errors.push(`Invalid pubDate format (expected YYYY-MM-DD): "${fm.pubDate}"`);
  }
  if (fm.heroImage && !fm.heroImage.startsWith('/') && !fm.heroImage.startsWith('..')) {
    errors.push(`Hero image path should be absolute or relative: "${fm.heroImage}"`);
  }
  return errors;
}

async function validateImages(md, postFile) {
  const errors = [];
  // Match markdown image syntax: ![alt](path)
  const imgRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = imgRegex.exec(md)) !== null) {
    const imgPath = match[1];
    // Skip URLs
    if (imgPath.startsWith('http') || imgPath.startsWith('//')) continue;
    // Resolve relative paths
    let fullPath = imgPath;
    if (imgPath.startsWith('../../assets/')) {
      fullPath = path.join(ROOT, 'src', imgPath);
    } else if (imgPath.startsWith('..')) {
      fullPath = path.resolve(path.dirname(path.join(ROOT, postFile)), imgPath);
    }
    try {
      await fs.access(fullPath);
    } catch {
      errors.push(`Image not found: ${imgPath}`);
    }
  }
  return errors;
}

function validateLinks(md) {
  const errors = [];
  // Match markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(md)) !== null) {
    const url = match[2];
    // Validate internal links (start with /)
    if (url.startsWith('/')) {
      if (!url || url === '/') {
        errors.push(`Invalid internal link: "${url}"`);
      }
    }
    // Validate external URLs basic format
    if (url.startsWith('http')) {
      try {
        new URL(url);
      } catch {
        errors.push(`Malformed URL: "${url}"`);
      }
    }
  }
  return errors;
}

function validateContent(md) {
  const errors = [];
  // Extract content (after frontmatter)
  const contentMatch = md.match(/^---\n[\s\S]*?\n---\n([\s\S]*)/);
  if (!contentMatch) return errors;
  const content = contentMatch[1].trim();
  
  if (content.length < 50) {
    errors.push(`Content too short (min 50 chars): ${content.length} chars`);
  }
  // Check for at least one heading
  if (!/^#+\s/m.test(content)) {
    errors.push(`No headings found in content (should have at least one #, ##, etc.)`);
  }
  // Check for common placeholder text
  if (content.includes('TODO') || content.includes('FIXME')) {
    errors.push(`Content contains TODO/FIXME markers`);
  }
  return errors;
}

async function main() {
  const meta = await readMeta();
  const md = await readPost(meta.file);

  const results = {
    file: meta.file,
    pass: true,
    checks: {},
  };

  // 1. Frontmatter structure
  try {
    const fm = parseFrontmatter(md);
    results.checks.frontmatterParse = { ok: true };
    
    // 2. Frontmatter validation
    const fmErrors = validateFrontmatter(fm);
    results.checks.frontmatterValidation = fmErrors.length === 0 
      ? { ok: true } 
      : { ok: false, errors: fmErrors };
    if (fmErrors.length) results.pass = false;
  } catch (e) {
    results.checks.frontmatterParse = { ok: false, error: e.message };
    results.pass = false;
  }

  // 3. Image validation
  try {
    const imgErrors = await validateImages(md, meta.file);
    results.checks.images = imgErrors.length === 0
      ? { ok: true }
      : { ok: false, errors: imgErrors };
    if (imgErrors.length) results.pass = false;
  } catch (e) {
    results.checks.images = { ok: false, error: e.message };
    results.pass = false;
  }

  // 4. Link validation
  try {
    const linkErrors = validateLinks(md);
    results.checks.links = linkErrors.length === 0
      ? { ok: true }
      : { ok: false, errors: linkErrors };
    if (linkErrors.length) results.pass = false;
  } catch (e) {
    results.checks.links = { ok: false, error: e.message };
    results.pass = false;
  }

  // 5. Content validation
  try {
    const contentErrors = validateContent(md);
    results.checks.content = contentErrors.length === 0
      ? { ok: true }
      : { ok: false, errors: contentErrors };
    if (contentErrors.length) results.pass = false;
  } catch (e) {
    results.checks.content = { ok: false, error: e.message };
    results.pass = false;
  }

  // Print results
  console.log('\n=== Blog Post Test Results ===\n');
  console.log(`File: ${meta.file}`);
  console.log(`Status: ${results.pass ? '✅ PASS' : '❌ FAIL'}\n`);

  Object.entries(results.checks).forEach(([check, result]) => {
    const icon = result.ok ? '✓' : '✗';
    console.log(`${icon} ${check}`);
    if (!result.ok && result.errors) {
      result.errors.forEach(err => console.log(`  → ${err}`));
    }
    if (!result.ok && result.error) {
      console.log(`  → ${result.error}`);
    }
  });

  console.log('\n================================\n');

  // Save test report for workflow
  const reportPath = path.join(ROOT, '.agent', 'test-report.json');
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2), 'utf8');

  process.exit(results.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(`\n❌ Test error: ${err.message}\n`);
  process.exit(1);
});
