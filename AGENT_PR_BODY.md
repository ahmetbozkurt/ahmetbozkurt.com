# Agent-generated blog post

- Topic: quantum bilgisayarlar hakkında yazı geleceğimiz nasıl şekillenecek
- Lang: tr
- File: src/content/blog/developer.md

## Multi-Agent Reviews

### Developer
- Kod örnekleri çalıştırılabilir ve minimal olmalı.
- Script parametreleri README'de örneklendirilmeli.
- Hata mesajları eyleme dönük olmalı.
- Hero görsel yolları Astro image() ile uyumlu olmalı.

### Project Manager
- İş akışı manuel ve zamanlanmış tetikleme içeriyor.
- PR inceleme zorunlu; yayınlama ayrı adım olmalı.
- Konu tanımı ve kabul kriterleri netleştirilmeli.
- Takvim: haftalık üretim + aylık tema derlemesi.

### Tester
- İçerik şema doğrulaması (astro build) zorunlu.
- Kırık link ve görsel kontrol adımı eklenmeli.
- Komutlar Windows/Linux örnekleri ile test edilmeli.
- Başlık/slug tekrar çakışmaları ele alınmalı.

### Reviewer
- Kaynak ve atıflar kontrol edilmeli.
- Ton ve tutarlılık şablonu uygulanmalı.
- Büyük değişiklikler için taslak/geri bildirim turu.
- PR açıklaması özet + maddeler içermeli.

### Security
- Secrets sadece Actions Secrets içinde tutulmalı.
- Agent isteklerinde oran sınırlama/kayıt tutma gerekli.
- İçerik sızıntısı ve telif riski not edilmeli.
- Bağımlılıklar güvenlik güncellemeleriyle takip edilmeli.

## Checklist
- [ ] Content matches topic and audience
- [ ] Links/images render correctly
- [ ] No secrets or sensitive data
- [ ] Approvals from reviewer/security obtained
