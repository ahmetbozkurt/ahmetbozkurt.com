---
title: "Custom Agent ile Astro Blog Üretimi: SDLC ve GitHub Süreci"
description: "Custom agent ile Astro blog üretimi için SDLC + GitHub iş akışı"
pubDate: "2026-01-21"
heroImage: "../../assets/blog-placeholder-2.jpg"
---

# Custom Agent ile Astro Blog Üretimi: SDLC ve GitHub Süreci

Bu yazı, özel bir ajan (custom agent) kullanarak Astro tabanlı bir blog sitesine otomatik içerik üreten SDLC + GitHub Actions sürecini açıklar.

## Hedef
- Konu planlama ve yönetişim
- Ajan ile içerik üretimi
- Doğrulama (şema, link, kalite)
- PR açma, review ve publish

## Mimari
- Custom Agent: HTTP endpoint veya MCP tabanlı servis
- Workflow: GitHub Actions ile zamanlı/manuel tetikleme
- Script: İçerik üretip src/content/blog altına MD dosyası yazar

## Örnek İş Akışı (Özet)
1. Konu ve parametreler girilir (workflow_dispatch).
2. Script, ajana istek atar; içerik döner.
3. Frontmatter ile birleştirilir ve dosya oluşturulur.
4. Astro build ile şema doğrulanır.
5. PR açılır, inceleme sonrası merge edilir.

## Güvenlik
- Secrets: OPENAI_API_KEY / AGENT_API_KEY GitHub Secrets içinde tutulur.
- Rate limiting ve token kullanımına dikkat edilir.
- İçerik denetimi ve PR review zorunludur.

Devamı için repository'deki workflow ve script dosyalarına bakın.
