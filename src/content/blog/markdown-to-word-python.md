---
title: 'Markdown Dosyalarını Python ile Word Formatına Dönüştürme'
description: 'Chocolatey, Python ve Pandoc kullanarak Markdown dosyalarını profesyonel Word belgelerine nasıl dönüştüreceğinizi öğrenin'
pubDate: 'Nov 11 2025'
heroImage: '/images/markdown_python.png'
---


Markdown, yazılım geliştiriciler ve teknik yazarlar arasında popüler bir formattır. Ancak bazen bu içeriği Word formatına dönüştürmemiz gerekebilir. Bu yazıda, Windows üzerinde Chocolatey paket yöneticisi ve Python kullanarak Markdown dosyalarını Word'e nasıl dönüştüreceğimizi göreceğiz.

## Gereksinimler

Bu işlem için ihtiyacımız olanlar:
- **Chocolatey**: Windows için paket yöneticisi
- **Python**: Programlama dili
- **Pandoc**: Evrensel belge dönüştürücü
- **python-docx**: Python Word kütüphanesi (opsiyonel)

## Adım 1: Chocolatey Kurulumu

Chocolatey, Windows için güçlü bir paket yöneticisidir. Kurulum için PowerShell'i **yönetici modunda** açın ve şu komutu çalıştırın:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

Kurulumu doğrulamak için:

```powershell
choco --version
```

## Adım 2: Python Kurulumu

Chocolatey ile Python'ı kolayca kurabiliriz:

```powershell
choco install python -y
```

Kurulumu kontrol edin:

```powershell
python --version
pip --version
```

## Adım 3: Pandoc Kurulumu

Pandoc, Markdown'dan Word'e dönüşüm için en güçlü araçtır:

```powershell
choco install pandoc -y
```

Kurulumu doğrulayın:

```powershell
pandoc --version
```

## Yöntem 1: Pandoc ile Doğrudan Dönüştürme (En Basit)

En hızlı yöntem Pandoc'u doğrudan kullanmaktır:

```powershell
pandoc dosya.md -o cikti.docx
```

### Gelişmiş Pandoc Kullanımı

Daha profesyonel çıktılar için özel ayarlar:

```powershell
# Referans stil dosyası ile
pandoc dosya.md -o cikti.docx --reference-doc=template.docx

# İçindekiler tablosu eklemek
pandoc dosya.md -o cikti.docx --toc --toc-depth=3

# Başlık ve yazar bilgisi ile
pandoc dosya.md -o cikti.docx --metadata title="Başlık" --metadata author="Yazar Adı"
```

## Yöntem 2: Python ile Otomatik Dönüştürme

Python ile daha esnek ve otomatize edilebilir bir çözüm:

### Gerekli Kütüphaneleri Kurun

```powershell
pip install pypandoc python-docx markdown
```

### Basit Python Scripti

`markdown_to_word.py` dosyası oluşturun:

```python
import pypandoc
import os

def markdown_to_word(md_file, output_file=None):
    """
    Markdown dosyasını Word formatına dönüştürür
    
    Args:
        md_file: Markdown dosya yolu
        output_file: Çıktı dosya yolu (opsiyonel)
    """
    if output_file is None:
        output_file = os.path.splitext(md_file)[0] + '.docx'
    
    try:
        pypandoc.convert_file(md_file, 'docx', outputfile=output_file)
        print(f"✓ Dönüştürme başarılı: {output_file}")
        return True
    except Exception as e:
        print(f"✗ Hata: {e}")
        return False

if __name__ == "__main__":
    # Kullanım örneği
    markdown_to_word("ornekdosya.md")
```

Scripti çalıştırın:

```powershell
python markdown_to_word.py
```

### Gelişmiş Python Scripti (Toplu Dönüştürme)

Bir klasördeki tüm Markdown dosyalarını dönüştürmek için:

```python
import pypandoc
import os
from pathlib import Path

def batch_convert_markdown_to_word(input_dir, output_dir=None):
    """
    Bir klasördeki tüm Markdown dosyalarını Word'e dönüştürür
    
    Args:
        input_dir: Markdown dosyalarının bulunduğu klasör
        output_dir: Çıktı klasörü (opsiyonel)
    """
    if output_dir is None:
        output_dir = input_dir
    
    # Çıktı klasörünü oluştur
    os.makedirs(output_dir, exist_ok=True)
    
    # Tüm .md dosyalarını bul
    md_files = list(Path(input_dir).glob("*.md"))
    
    if not md_files:
        print("Markdown dosyası bulunamadı!")
        return
    
    print(f"{len(md_files)} Markdown dosyası bulundu. Dönüştürme başlıyor...\n")
    
    successful = 0
    failed = 0
    
    for md_file in md_files:
        output_file = os.path.join(output_dir, md_file.stem + '.docx')
        
        try:
            pypandoc.convert_file(
                str(md_file), 
                'docx', 
                outputfile=output_file,
                extra_args=['--toc']  # İçindekiler tablosu ekle
            )
            print(f"✓ {md_file.name} -> {os.path.basename(output_file)}")
            successful += 1
        except Exception as e:
            print(f"✗ {md_file.name} - Hata: {e}")
            failed += 1
    
    print(f"\n{'='*50}")
    print(f"Toplam: {len(md_files)} dosya")
    print(f"Başarılı: {successful}")
    print(f"Başarısız: {failed}")

if __name__ == "__main__":
    # Kullanım
    batch_convert_markdown_to_word("./markdown_files", "./word_files")
```

## Yöntem 3: Python-docx ile Manuel Dönüştürme

Daha fazla kontrol istiyorsanız, `python-docx` ile manuel dönüştürme:

```python
from docx import Document
from docx.shared import Pt, Inches
import markdown
from bs4 import BeautifulSoup
import re

def markdown_to_word_custom(md_file, output_file):
    """
    Markdown dosyasını python-docx ile özelleştirilmiş Word'e dönüştürür
    """
    # Markdown'ı oku
    with open(md_file, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # Markdown'ı HTML'e çevir
    html = markdown.markdown(md_content, extensions=['extra', 'codehilite'])
    
    # Word belgesi oluştur
    doc = Document()
    
    # HTML'i parse et
    soup = BeautifulSoup(html, 'html.parser')
    
    for element in soup.find_all(['h1', 'h2', 'h3', 'p', 'code', 'pre', 'ul', 'ol']):
        if element.name == 'h1':
            doc.add_heading(element.get_text(), level=1)
        elif element.name == 'h2':
            doc.add_heading(element.get_text(), level=2)
        elif element.name == 'h3':
            doc.add_heading(element.get_text(), level=3)
        elif element.name == 'p':
            doc.add_paragraph(element.get_text())
        elif element.name in ['code', 'pre']:
            p = doc.add_paragraph(element.get_text())
            p.style = 'List Bullet'
        elif element.name in ['ul', 'ol']:
            for li in element.find_all('li'):
                doc.add_paragraph(li.get_text(), style='List Bullet')
    
    # Kaydet
    doc.save(output_file)
    print(f"✓ Belge kaydedildi: {output_file}")

if __name__ == "__main__":
    markdown_to_word_custom("ornekdosya.md", "cikti_custom.docx")
```

## Komple Çözüm: CLI Aracı

Komut satırından kullanılabilir bir araç oluşturalım:

```python
#!/usr/bin/env python
"""
Markdown to Word Converter CLI Tool
"""

import pypandoc
import argparse
import os
from pathlib import Path

def convert_file(input_file, output_file=None, toc=False, template=None):
    """Tek dosya dönüştür"""
    if output_file is None:
        output_file = os.path.splitext(input_file)[0] + '.docx'
    
    extra_args = []
    if toc:
        extra_args.extend(['--toc', '--toc-depth=3'])
    if template:
        extra_args.extend(['--reference-doc', template])
    
    pypandoc.convert_file(input_file, 'docx', outputfile=output_file, extra_args=extra_args)
    return output_file

def main():
    parser = argparse.ArgumentParser(
        description='Markdown dosyalarını Word formatına dönüştür'
    )
    parser.add_argument('input', help='Markdown dosyası veya klasörü')
    parser.add_argument('-o', '--output', help='Çıktı dosyası veya klasörü')
    parser.add_argument('--toc', action='store_true', help='İçindekiler tablosu ekle')
    parser.add_argument('--template', help='Word şablon dosyası')
    parser.add_argument('-r', '--recursive', action='store_true', help='Alt klasörleri de tara')
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    
    if input_path.is_file():
        # Tek dosya dönüştür
        output = args.output or input_path.with_suffix('.docx')
        convert_file(str(input_path), str(output), args.toc, args.template)
        print(f"✓ Dönüştürüldü: {output}")
    
    elif input_path.is_dir():
        # Klasör dönüştür
        pattern = "**/*.md" if args.recursive else "*.md"
        md_files = list(input_path.glob(pattern))
        
        output_dir = Path(args.output) if args.output else input_path
        output_dir.mkdir(exist_ok=True)
        
        for md_file in md_files:
            output_file = output_dir / md_file.with_suffix('.docx').name
            try:
                convert_file(str(md_file), str(output_file), args.toc, args.template)
                print(f"✓ {md_file.name} -> {output_file.name}")
            except Exception as e:
                print(f"✗ {md_file.name} - Hata: {e}")

if __name__ == "__main__":
    main()
```

Kullanım örnekleri:

```powershell
# Tek dosya
python md2word.py dosya.md

# İçindekiler tablosu ile
python md2word.py dosya.md --toc

# Şablon kullanarak
python md2word.py dosya.md --template sablon.docx

# Klasördeki tüm dosyaları dönüştür
python md2word.py ./markdown_klasoru -o ./word_klasoru

# Alt klasörleri de tara
python md2word.py ./markdown_klasoru -r --toc
```

## Bonus: Stil Şablonu Oluşturma

Pandoc için özel bir Word şablonu oluşturmak:

1. Basit bir Markdown dosyası oluşturun (`sablon.md`):

```markdown
# Başlık 1
## Başlık 2
### Başlık 3

Normal paragraf metni.

**Kalın metin** ve *italik metin*.

- Liste öğesi 1
- Liste öğesi 2

1. Numaralı liste
2. İkinci öğe

`kod örneği`
```

2. Word referans dosyası oluşturun:

```powershell
pandoc sablon.md -o referans.docx
```

3. `referans.docx` dosyasını açın ve stilleri düzenleyin (fontlar, renkler, boşluklar)

4. Artık bu şablonu kullanabilirsiniz:

```powershell
pandoc dosya.md -o cikti.docx --reference-doc=referans.docx
```

## Karşılaşılabilecek Sorunlar ve Çözümler

### Pandoc Bulunamadı Hatası

```powershell
# PATH'e manuel ekleyin
$env:Path += ";C:\Program Files\Pandoc\"
```

### Türkçe Karakter Sorunları

Python dosyalarınızda encoding belirtin:

```python
with open('dosya.md', 'r', encoding='utf-8') as f:
    content = f.read()
```

### PyPandoc Kurulum Hatası

```powershell
# Önce Pandoc'un kurulu olduğundan emin olun
pip install --upgrade pypandoc
```

## Sonuç

Bu yazıda Chocolatey ve Python kullanarak Markdown dosyalarını Word formatına dönüştürmenin üç farklı yöntemini gördük:

1. **Pandoc ile doğrudan**: En hızlı ve basit yöntem
2. **PyPandoc ile Python**: Otomatik ve esnek
3. **Python-docx ile manuel**: En fazla kontrol

Hangi yöntemi seçeceğiniz ihtiyaçlarınıza bağlı:
- **Hızlı tek seferlik dönüşüm** → Pandoc komut satırı
- **Otomatik toplu işlem** → PyPandoc script
- **Özel formatlar ve kontrol** → python-docx

---

**Faydalı Kaynaklar:**
- [Pandoc Resmi Dokümantasyonu](https://pandoc.org/MANUAL.html)
- [PyPandoc GitHub](https://github.com/JessicaTegner/pypandoc)
- [Python-docx Dokümantasyonu](https://python-docx.readthedocs.io/)
- [Chocolatey Paket Listesi](https://community.chocolatey.org/packages)

---

*Bu kılavuz, teknik dokümantasyonu Markdown formatında yazıp gerektiğinde Word'e dönüştürmek isteyen yazılımcılar ve teknik yazarlar için hazırlanmıştır.*
