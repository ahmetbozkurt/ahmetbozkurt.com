---
title: "MCP Best Practices: Güvenli Uygulama Geliştirme Rehberi"
description: "Model Context Protocol'ı güvenli ve etkili bir şekilde kullanmak için en iyi uygulamalar ve implementasyon desenleri"
pubDate: "2026-01-09"
heroImage: "../../assets/mcp_best_practice.jpg"
---

## Giriş

Model Context Protocol (MCP), LLM'lerin harici kaynaklara güvenli bir şekilde erişmesini sağlayan bir protokol. Ancak kötü uygulamalar, tasarım hataları veya eksik kontroller ciddi güvenlik açıklarına yol açabiliyor.

Bu rehberde MCP'yi güvenli ve verimli kullanmanın yollarını, gerçek implementasyon örnekleriyle birlikte inceleyeceğiz.

## 1. Prensip: En Az Yetki (Principle of Least Privilege)

### Temel Kavram

Her araç, her kaynak yalnızca ihtiyacı olan izinleri almalıdır. Hiçbir zaman fazla yetki vermeyin.

### Uygulama

```python
# ❌ YANLIŞ: Tüm dosya sistemi erişimi
mcp_server = MCPServer({
    "tools": [
        {
            "name": "read_file",
            "allowed_paths": ["/"]  # Tüm dosya sistemi!
        }
    ]
})

# ✅ DOĞRU: Sınırlı erişim
mcp_server = MCPServer({
    "tools": [
        {
            "name": "read_file",
            "allowed_paths": [
                "/app/documents",
                "/app/config"
            ],
            "denied_patterns": [
                "*.key",
                "*.secret",
                "*password*"
            ]
        }
    ]
})
```

### Pratik Örnekler

```python
# Veritabanı aracı için en az yetki
database_tool = {
    "name": "query_database",
    "allowed_tables": ["users", "products"],  # Sadece gerekli tablolar
    "allowed_operations": ["SELECT"],  # Yazma işlemleri yok
    "row_limit": 100,  # Veri sızıntısı riski azalt
    "timeout": 5  # DOS saldırılarından koru
}

# E-posta gönderme aracı
email_tool = {
    "name": "send_email",
    "allowed_recipients": ["admin@company.com"],
    "rate_limit": 5,  # Saat başına 5 e-posta
    "subject_filter": True,  # Farklı başlık kontrol et
    "attachment_disabled": True  # Dosya eki kabul etme
}
```

## 2. Input Validation ve Sanitization

### Temel Validasyon Katmanı

```python
from typing import Any, Dict
import re

class MCPInputValidator:
    """MCP araçları için giriş doğrulaması"""
    
    def __init__(self):
        self.patterns = {
            "sql_injection": r"(DROP|DELETE|INSERT|UPDATE|UNION|SELECT.*--|;)",
            "path_traversal": r"(\.\./|\.\.\\|%2e%2e)",
            "command_injection": r"([;&|`$(){}\\])",
        }
    
    def validate_file_path(self, path: str) -> str:
        """Dosya yolunu doğrula"""
        # Normalize et
        normalized = path.replace("\\", "/")
        
        # Path traversal kontrol et
        if re.search(self.patterns["path_traversal"], normalized):
            raise ValueError("Geçersiz dosya yolu: Path traversal denemesi")
        
        # Mutlak yola dönüştür ve sınırları kontrol et
        absolute_path = os.path.abspath(normalized)
        allowed_base = "/app/documents"
        
        if not absolute_path.startswith(allowed_base):
            raise ValueError("Dosya erişim sınırı dışında")
        
        return absolute_path
    
    def validate_sql_query(self, query: str) -> bool:
        """SQL sorgusu doğrula"""
        # Tehlikeli pattern'ler kontrol et
        if re.search(self.patterns["sql_injection"], query, re.IGNORECASE):
            raise ValueError("Geçersiz SQL sorgusu")
        
        # Parameterized query'i zorla
        if not query.count("?") > 0:
            raise ValueError("Parameterized queries kullanmalısınız")
        
        return True
    
    def validate_email(self, email: str) -> str:
        """E-posta adresini doğrula"""
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        
        if not re.match(pattern, email):
            raise ValueError("Geçersiz e-posta adresi")
        
        # Whitelist kontrolü
        domain = email.split("@")[1]
        allowed_domains = ["company.com", "trusted.org"]
        
        if domain not in allowed_domains:
            raise ValueError(f"E-posta alanı {domain} izin verilen listede değil")
        
        return email

# Kullanım
validator = MCPInputValidator()

# Dosya oku
file_path = validator.validate_file_path("/app/documents/report.pdf")

# SQL sorgusu
sql = "SELECT * FROM users WHERE id = ?"
validator.validate_sql_query(sql)

# E-posta
email = validator.validate_email("user@company.com")
```

## 3. Tool Isolation ve Sandboxing

### Docker'da Araçları Çalıştır

```dockerfile
# Dockerfile: Isolated MCP Tool
FROM python:3.11-slim

# Güvenli olmayan paketler yükleme
RUN useradd -m -u 1000 mcp_user && \
    chmod 755 /tmp

WORKDIR /app

# Uygulamayı kopyala
COPY --chown=mcp_user:mcp_user . .

# Düşük ayrıcalıklı kullanıcı olarak çalıştır
USER mcp_user

# Ağ ve kaynak kısıtlamaları
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import socket; s = socket.socket(); s.connect(('localhost', 8000))"

ENTRYPOINT ["python", "-u", "mcp_tool.py"]
```

### Process Isolation Konfigürasyonu

```yaml
# docker-compose.yml
version: '3.8'
services:
  mcp_tool_1:
    image: mcp-isolated-tool:latest
    container_name: mcp_tool_1
    networks:
      - mcp_network
    resources:
      limits:
        cpus: '0.5'
        memory: 512M
      reservations:
        cpus: '0.25'
        memory: 256M
    environment:
      - MCP_TIMEOUT=5
      - LOG_LEVEL=INFO
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
      - /var/tmp
    volumes:
      - /app/safe_data:/data:ro
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE

  mcp_tool_2:
    image: mcp-isolated-tool:latest
    container_name: mcp_tool_2
    networks:
      - mcp_network
    # ... benzer konfigürasyon

networks:
  mcp_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## 4. Rate Limiting ve DoS Koruması

```python
from functools import wraps
from datetime import datetime, timedelta
from collections import defaultdict
import threading

class RateLimiter:
    """Araç çağrılarını sınırla"""
    
    def __init__(self):
        self.requests = defaultdict(list)
        self.lock = threading.Lock()
    
    def is_allowed(self, user_id: str, tool_name: str, 
                   max_requests: int = 10, 
                   window_seconds: int = 60) -> bool:
        """Rate limit kontrolü"""
        with self.lock:
            now = datetime.now()
            key = f"{user_id}:{tool_name}"
            
            # Eski istekleri temizle
            cutoff = now - timedelta(seconds=window_seconds)
            self.requests[key] = [
                req_time for req_time in self.requests[key]
                if req_time > cutoff
            ]
            
            # Sınırı kontrol et
            if len(self.requests[key]) >= max_requests:
                return False
            
            # Yeni isteği kaydet
            self.requests[key].append(now)
            return True

# Decorator kullanımı
limiter = RateLimiter()

def rate_limited(max_requests=10, window_seconds=60):
    def decorator(func):
        @wraps(func)
        def wrapper(user_id: str, *args, **kwargs):
            tool_name = func.__name__
            
            if not limiter.is_allowed(user_id, tool_name, 
                                     max_requests, window_seconds):
                raise RateLimitError(
                    f"Rate limit exceeded for {tool_name}. "
                    f"Max {max_requests} requests per {window_seconds}s"
                )
            
            return func(*args, **kwargs)
        return wrapper
    return decorator

# Uygulama
@rate_limited(max_requests=5, window_seconds=60)
def query_database(user_id: str, query: str):
    return execute_query(query)
```

## 5. Audit Logging ve Monitoring

```python
import json
import logging
from datetime import datetime
from dataclasses import dataclass, asdict

@dataclass
class AuditLog:
    """MCP araçı audit logu"""
    timestamp: str
    user_id: str
    tool_name: str
    action: str
    status: str
    duration_ms: float
    ip_address: str
    input_hash: str
    output_summary: str
    error_message: str = None

class MCPAuditLogger:
    """Kapsamlı audit logging"""
    
    def __init__(self, log_file: str):
        self.logger = logging.getLogger("mcp_audit")
        handler = logging.FileHandler(log_file)
        handler.setFormatter(
            logging.Formatter('%(message)s')
        )
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)
    
    def log_tool_execution(self, 
                          user_id: str,
                          tool_name: str,
                          action: str,
                          status: str,
                          duration_ms: float,
                          ip_address: str,
                          user_input: str,
                          output: str,
                          error: str = None):
        """Araç yürütmesini kaydıt et"""
        
        import hashlib
        input_hash = hashlib.sha256(user_input.encode()).hexdigest()[:16]
        output_summary = output[:100] + "..." if len(output) > 100 else output
        
        audit_log = AuditLog(
            timestamp=datetime.utcnow().isoformat(),
            user_id=user_id,
            tool_name=tool_name,
            action=action,
            status=status,
            duration_ms=duration_ms,
            ip_address=ip_address,
            input_hash=input_hash,
            output_summary=output_summary,
            error_message=error
        )
        
        self.logger.info(json.dumps(asdict(audit_log)))

# Kullanım
audit_logger = MCPAuditLogger("/var/log/mcp_audit.log")

# Araç yürütülürken
start_time = time.time()
try:
    result = execute_tool(user_input)
    duration = (time.time() - start_time) * 1000
    
    audit_logger.log_tool_execution(
        user_id="user123",
        tool_name="read_file",
        action="READ",
        status="SUCCESS",
        duration_ms=duration,
        ip_address=request.remote_addr,
        user_input=user_input,
        output=result
    )
except Exception as e:
    duration = (time.time() - start_time) * 1000
    
    audit_logger.log_tool_execution(
        user_id="user123",
        tool_name="read_file",
        action="READ",
        status="FAILED",
        duration_ms=duration,
        ip_address=request.remote_addr,
        user_input=user_input,
        output="",
        error=str(e)
    )
```

## 6. Tool Manifest Güvenliği

```json
{
  "name": "safe_mcp_tools",
  "version": "1.0.0",
  "tools": [
    {
      "name": "read_document",
      "description": "Belirtilen belgeyi oku",
      "type": "file_reader",
      "requiredArgs": ["file_path"],
      "optionalArgs": ["encoding"],
      "timeout": 5000,
      "maxResourcesUsage": {
        "memory": "100MB",
        "cpu": "50%"
      },
      "accessControl": {
        "allowedUsers": ["group:analysts"],
        "deniedUsers": [],
        "requiresApproval": false
      },
      "security": {
        "validateInput": true,
        "sanitizeOutput": true,
        "logExecution": true
      },
      "rateLimit": {
        "requestsPerMinute": 60,
        "requestsPerHour": 1000
      },
      "allowedPaths": [
        "/documents/safe",
        "/reports"
      ],
      "blockedPatterns": [
        "*.secret",
        "*.key",
        "*password*"
      ]
    }
  ],
  "integrations": {
    "llmModel": "gpt-4",
    "contextWindow": 8192,
    "maxToolsPerRequest": 5
  }
}
```

## 7. Credential Management

```python
from abc import ABC, abstractmethod
import os
from cryptography.fernet import Fernet

class CredentialStore(ABC):
    """Kimlik bilgileri için soyut depo"""
    
    @abstractmethod
    def get(self, key: str) -> str:
        pass
    
    @abstractmethod
    def set(self, key: str, value: str) -> None:
        pass

class EncryptedCredentialStore(CredentialStore):
    """Şifreli kimlik bilgileri deposu"""
    
    def __init__(self, key_file: str = "/etc/mcp/encryption.key"):
        self.cipher = self._load_cipher(key_file)
        self.store = {}
    
    def _load_cipher(self, key_file: str) -> Fernet:
        if not os.path.exists(key_file):
            raise FileNotFoundError(f"Encryption key not found: {key_file}")
        
        with open(key_file, 'rb') as f:
            key = f.read()
        
        return Fernet(key)
    
    def get(self, key: str) -> str:
        if key not in self.store:
            raise KeyError(f"Credential not found: {key}")
        
        encrypted = self.store[key]
        return self.cipher.decrypt(encrypted).decode()
    
    def set(self, key: str, value: str) -> None:
        encrypted = self.cipher.encrypt(value.encode())
        self.store[key] = encrypted

# ❌ YANLIŞ: Kimlik bilgilerini kodda
database_url = "postgresql://user:password@localhost/db"

# ✅ DOĞRU: Güvenli depodan oku
cred_store = EncryptedCredentialStore()
database_url = cred_store.get("db_connection_string")

# Çevre değişkenlerinden oku
api_key = os.getenv("API_KEY")  # .env dosyasından veya sistem ayarlarından
```

## 8. Dependency Management

```python
# requirements.txt - Tam sürüm pinleme
python-dotenv==1.0.0
requests==2.31.0
cryptography==41.0.0
pydantic==2.5.0

# Güvenlik açığı kontrolü
# pip install safety
# safety check

# Düzenli güncellemeler
# pip list --outdated
```

## Best Practices Özet

| Pratik | Açıklama | Öncelik |
|--------|----------|---------|
| En Az Yetki | Sadece ihtiyaç duyulan izinler | Kritik |
| Input Validation | Tüm girdileri kontrol et | Kritik |
| Logging & Audit | Her şeyi kaydıt et | Kritik |
| Rate Limiting | DoS saldırılarından koru | Yüksek |
| Isolation | Araçları izole et | Yüksek |
| Credential Management | Sırları güvenli tut | Yüksek |
| Regular Audits | Periyodik kontrol | Orta |
| Security Headers | HTTP başlıkları | Orta |

## Sonuç

MCP güvenliği tek bir özellik ya da kontrol listesi değil. Gerçek güvenlik, tasarımdan implementasyona kadar tüm süreçte katmanlı bir yaklaşım gerektirir.

Önemli olan gözlemlemek, doğrulamak, izole etmek ve kayıt tutmak. Bu prensipler üzerine inşa ettiğiniz sistemler hem güvenli hem de sürdürülebilir olacaktır.
