---
title: "API Security & Authentication: Modern Web Güvenliği"
description: "RESTful API'lar ve Backend sistemleri için authentication, authorization ve güvenlik best practices"
pubDate: "2026-01-09"
heroImage: "../../assets/api_sec_auth.jpg"
---

## Giriş

Günümüzde neredeyse her web uygulaması API'lar üzerinden çalışıyor. Frontend'den backend'e, mikroservisler arasında, mobil uygulamalardan sunuculara... Her yerde API'lar var.

Peki bu kadar kritik bir bileşeni nasıl güvenli hale getiriyoruz? Bu yazıda API güvenliğinin temellerinden - authentication ve authorization'dan - best practices'lere kadar her şeyi inceleyeceğiz.

## 1. Authentication (Kimlik Doğrulama)

### 1.1 JWT (JSON Web Tokens)

```python
from datetime import datetime, timedelta
import jwt
import secrets
from typing import Optional, Dict

class JWTManager:
    """JWT token yönetimi"""
    
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.token_expiry = timedelta(hours=1)
    
    def create_token(self, 
                    user_id: str,
                    username: str,
                    permissions: list) -> str:
        """Access token oluştur"""
        
        payload = {
            "user_id": user_id,
            "username": username,
            "permissions": permissions,
            "exp": datetime.utcnow() + self.token_expiry,
            "iat": datetime.utcnow(),
            "jti": secrets.token_hex(16)  # Token ID (revocation için)
        }
        
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        return token
    
    def create_refresh_token(self, user_id: str) -> str:
        """Refresh token oluştur (daha uzun ömre sahip)"""
        
        payload = {
            "user_id": user_id,
            "exp": datetime.utcnow() + timedelta(days=7),
            "iat": datetime.utcnow(),
            "type": "refresh"
        }
        
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        return token
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """Token'ı doğrula"""
        
        try:
            payload = jwt.decode(
                token, 
                self.secret_key, 
                algorithms=[self.algorithm]
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise ValueError("Token süresi dolmuş")
        except jwt.InvalidTokenError:
            raise ValueError("Geçersiz token")
    
    def revoke_token(self, token_jti: str):
        """Token'ı iptal et (revocation listesine ekle)"""
        # Redis veya veritabanında sakla
        # self.revocation_store.add(token_jti)
        pass

# Kullanım
jwt_manager = JWTManager(secret_key="your-super-secret-key")

# Token oluştur
access_token = jwt_manager.create_token(
    user_id="123",
    username="johndoe",
    permissions=["read:documents", "write:documents"]
)

# Token doğrula
payload = jwt_manager.verify_token(access_token)
print(f"User: {payload['username']}, Permissions: {payload['permissions']}")
```

### 1.2 OAuth 2.0 Implementasyonu

```python
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
import hashlib

app = FastAPI()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class User(BaseModel):
    username: str
    email: str
    disabled: bool = False

class UserInDB(User):
    hashed_password: str

# Şifreli veritabanı
fake_users_db = {
    "johndoe": {
        "username": "johndoe",
        "email": "john@example.com",
        "hashed_password": hashlib.sha256(b"password123").hexdigest(),
        "disabled": False,
    }
}

def hash_password(password: str) -> str:
    """Şifreyi hash'le (gerçekte bcrypt kullan)"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Şifreyi doğrula"""
    return hash_password(plain_password) == hashed_password

def authenticate_user(username: str, password: str) -> Optional[UserInDB]:
    """Kullanıcıyı doğrula"""
    
    if username not in fake_users_db:
        return None
    
    user = UserInDB(**fake_users_db[username])
    
    if not verify_password(password, user.hashed_password):
        return None
    
    return user

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Mevcut kullanıcıyı al"""
    
    try:
        payload = jwt_manager.verify_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    
    username = payload.get("username")
    
    if username not in fake_users_db:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
    
    return UserInDB(**fake_users_db[username])

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Token elde et"""
    
    user = authenticate_user(form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Yanlış kullanıcı adı veya şifre"
        )
    
    access_token = jwt_manager.create_token(
        user_id=form_data.username,
        username=user.username,
        permissions=["read:user_data"]
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.get("/users/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Mevcut kullanıcı bilgisini al"""
    return current_user
```

## 2. Authorization (Yetkilendirme)

### 2.1 Role-Based Access Control (RBAC)

```python
from enum import Enum
from typing import Set, Callable

class Role(Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"
    GUEST = "guest"

class Permission(Enum):
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"

# Role-Permission mapping
ROLE_PERMISSIONS = {
    Role.ADMIN: {
        Permission.READ,
        Permission.WRITE,
        Permission.DELETE,
        Permission.ADMIN
    },
    Role.MANAGER: {
        Permission.READ,
        Permission.WRITE
    },
    Role.USER: {
        Permission.READ
    },
    Role.GUEST: set()
}

class RBACManager:
    """Role-Based Access Control yöneticisi"""
    
    def __init__(self):
        self.user_roles = {}  # user_id -> Set[Role]
    
    def assign_role(self, user_id: str, role: Role):
        """Kullanıcıya rol ata"""
        if user_id not in self.user_roles:
            self.user_roles[user_id] = set()
        self.user_roles[user_id].add(role)
    
    def has_permission(self, user_id: str, permission: Permission) -> bool:
        """Kullanıcının izni var mı?"""
        
        if user_id not in self.user_roles:
            return False
        
        for role in self.user_roles[user_id]:
            if permission in ROLE_PERMISSIONS.get(role, set()):
                return True
        
        return False
    
    def has_any_role(self, user_id: str, roles: Set[Role]) -> bool:
        """Kullanıcı belirtilen rollerden birine sahip mi?"""
        
        user_roles = self.user_roles.get(user_id, set())
        return bool(user_roles & roles)

# FastAPI'da kullanım
rbac = RBACManager()

def require_permission(permission: Permission):
    """Permission'ı gerektiren dependency"""
    async def permission_checker(current_user: User = Depends(get_current_user)):
        # Kullanıcının izni var mı kontrol et
        if not rbac.has_permission(current_user.username, permission):
            raise HTTPException(
                status_code=403,
                detail=f"{permission.value} izni gerekli"
            )
        return current_user
    
    return permission_checker

@app.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: User = Depends(require_permission(Permission.DELETE))
):
    """Belgeyi sil (DELETE izni gerekli)"""
    return {"message": f"Belge {doc_id} silindi"}
```

### 2.2 Attribute-Based Access Control (ABAC)

```python
from dataclasses import dataclass

@dataclass
class Resource:
    """Kaynak"""
    id: str
    owner_id: str
    resource_type: str  # "document", "file", vb.
    is_public: bool = False

class ABACManager:
    """Attribute-Based Access Control"""
    
    def __init__(self):
        self.policies = []
    
    def add_policy(self, policy: Callable):
        """Erişim politikası ekle"""
        self.policies.append(policy)
    
    def can_access(self, 
                  user_id: str,
                  action: str,
                  resource: Resource) -> bool:
        """Kullanıcı kaynağa erişebilir mi?"""
        
        # Tüm politikaları kontrol et
        for policy in self.policies:
            if not policy(user_id, action, resource):
                return False
        
        return True

# Politikalar tanımla
def owner_policy(user_id: str, action: str, resource: Resource) -> bool:
    """Sahibi sınırsız erişimi olabilir"""
    if user_id == resource.owner_id:
        return True
    return False

def public_read_policy(user_id: str, action: str, resource: Resource) -> bool:
    """Herkese açık kaynaklar okunabilir"""
    if resource.is_public and action == "read":
        return True
    return False

def organization_policy(user_id: str, action: str, resource: Resource, 
                        user_org_id: str, resource_org_id: str) -> bool:
    """Aynı organizasyon içinde okuma izni"""
    if user_org_id == resource_org_id and action == "read":
        return True
    return False

# Kullanım
abac = ABACManager()
abac.add_policy(owner_policy)
abac.add_policy(public_read_policy)

resource = Resource(
    id="doc1",
    owner_id="user2",
    resource_type="document",
    is_public=False
)

# user1 kaynağa erişebilir mi?
can_access = abac.can_access("user1", "read", resource)
print(f"Can user1 access: {can_access}")  # False

# Sahibi erişebilir
can_access = abac.can_access("user2", "read", resource)
print(f"Can user2 access: {can_access}")  # True
```

## 3. API Security Best Practices

### 3.1 Rate Limiting

```python
from fastapi import FastAPI
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.util import get_remote_address

app = FastAPI()

@app.on_event("startup")
async def startup():
    await FastAPILimiter.init(redis_client)

@app.get("/api/data")
@limiter.limit("10/minute")
async def get_data(request: Request):
    """1 dakikada maksimum 10 istek"""
    return {"data": "..."}

# Global rate limiting
RATE_LIMITS = {
    "login": "5/minute",
    "api_call": "100/hour",
    "file_upload": "10/hour"
}
```

### 3.2 CORS (Cross-Origin Resource Sharing)

```python
from fastapi.middleware.cors import CORSMiddleware

# ❌ YANLIŞ: Tüm originleri izin ver
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Güvensiz!
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ DOĞRU: Spesifik originleri izin ver
ALLOWED_ORIGINS = [
    "https://example.com",
    "https://app.example.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    max_age=3600,
)
```

### 3.3 HTTPS ve Security Headers

```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware

# Trusted host
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["example.com", "www.example.com"]
)

# Security headers
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    
    # HSTS: HTTPS'yi zorla
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    # Content Security Policy
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    
    # XFrame Options
    response.headers["X-Frame-Options"] = "DENY"
    
    # XContent Type Options
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # Referrer Policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    return response
```

### 3.4 Input Validation (Fastpydantic)

```python
from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional

class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    age: int = Field(..., ge=18, le=120)
    
    @validator('username')
    def username_alphanumeric(cls, v):
        """Username alfanumerik olmalı"""
        if not v.isalnum():
            raise ValueError('Username yalnızca harf ve rakam içerebilir')
        return v
    
    @validator('password')
    def password_strength(cls, v):
        """Güçlü şifre kontrolü"""
        if not any(c.isupper() for c in v):
            raise ValueError('Şifre büyük harf içermeli')
        if not any(c.isdigit() for c in v):
            raise ValueError('Şifre rakam içermeli')
        return v

@app.post("/users")
async def create_user(user: CreateUserRequest):
    """Kullanıcı oluştur (otomatik validasyon)"""
    return {"username": user.username, "email": user.email}
```

## 4. API Versioning ve Deprecation

```python
from enum import Enum

class APIVersion(Enum):
    V1 = "v1"
    V2 = "v2"

# Versioning strategies

# 1. URL Path
@app.get("/api/v1/users")
async def get_users_v1():
    return {"version": "v1"}

@app.get("/api/v2/users")
async def get_users_v2():
    return {"version": "v2", "enhanced": True}

# 2. Header
@app.get("/users")
async def get_users(x_api_version: str = Header(default="v1")):
    if x_api_version == "v1":
        return {"version": "v1"}
    elif x_api_version == "v2":
        return {"version": "v2"}

# 3. Query parameter
@app.get("/users")
async def get_users(api_version: str = Query(default="v1")):
    if api_version == "v1":
        return {"version": "v1"}
    elif api_version == "v2":
        return {"version": "v2"}

# Deprecation warning
def deprecated_endpoint(version: str, recommended: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            print(f"⚠️ {version} deprecated. Use {recommended} instead")
            return await func(*args, **kwargs)
        return wrapper
    return decorator

@app.get("/api/v1/old-endpoint")
@deprecated_endpoint("v1", "v2")
async def old_endpoint():
    return {"message": "Bu endpoint deprecated"}
```

## 5. API Monitoring ve Security Logging

```python
import logging
import json
from datetime import datetime

class APISecurityLogger:
    """API güvenlik loggingı"""
    
    def __init__(self, log_file: str):
        self.logger = logging.getLogger("api_security")
        handler = logging.FileHandler(log_file)
        handler.setFormatter(
            logging.Formatter('%(message)s')
        )
        self.logger.addHandler(handler)
    
    def log_request(self, 
                   timestamp: str,
                   method: str,
                   endpoint: str,
                   user_id: str,
                   ip_address: str,
                   status_code: int,
                   response_time: float):
        """İsteği kayıt et"""
        
        log_entry = {
            "timestamp": timestamp,
            "method": method,
            "endpoint": endpoint,
            "user_id": user_id,
            "ip_address": ip_address,
            "status_code": status_code,
            "response_time_ms": response_time,
        }
        
        # Şüpheli aktiviteleri logla
        if status_code in [401, 403]:
            log_entry["severity"] = "HIGH"
        elif response_time > 5000:
            log_entry["severity"] = "MEDIUM"
        
        self.logger.info(json.dumps(log_entry))

# FastAPI middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = (time.time() - start_time) * 1000
    
    security_logger.log_request(
        timestamp=datetime.utcnow().isoformat(),
        method=request.method,
        endpoint=request.url.path,
        user_id=request.headers.get("x-user-id", "anonymous"),
        ip_address=request.client.host,
        status_code=response.status_code,
        response_time=duration
    )
    
    return response
```

## 6. Secure Password Management

```python
from passlib.context import CryptContext
import secrets

# bcrypt kullan (SHA256 değil!)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class PasswordManager:
    """Şifre yönetimi"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Şifreyi hash'le"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Şifreyi doğrula"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def generate_secure_password(length: int = 12) -> str:
        """Güvenli şifre oluştur"""
        return secrets.token_urlsafe(length)

# Şifre resetleme (secure token ile)
def send_password_reset_email(email: str):
    """Şifre reset e-postası gönder"""
    
    # Güvenli token oluştur
    reset_token = secrets.token_urlsafe(32)
    reset_link = f"https://example.com/reset-password?token={reset_token}"
    
    # Token'ı cache/db'de sakla (15 dakika validity)
    # cache.set(f"reset_token:{reset_token}", email, ex=900)
    
    # E-postayı gönder
    # send_email(email, reset_link)
```

## 7. API Security Checklist

```markdown
## Pre-Deployment Checklist

### Authentication & Authorization
- [ ] HTTPS kullanıyor mu?
- [ ] JWT token'lar güvenli mi?
- [ ] Refresh token'lar düzgün rotate ediliyor mu?
- [ ] CORS politikası spesifik origin'lere sınırlı mı?
- [ ] Authentication bypass zafiyeti var mı?

### Input & Output
- [ ] Tüm girdiler doğrulanıyor mu?
- [ ] SQL injection koruması var mı?
- [ ] XSS koruması var mı?
- [ ] Error mesajları sensitif bilgi açığa çıkarıyor mu?

### Rate Limiting & DoS
- [ ] Rate limiting uygulanmış mı?
- [ ] Large payload saldırılarına karşı korunan mı?
- [ ] Timeout'lar ayarlandı mı?

### Logging & Monitoring
- [ ] Tüm authentications kaydediliyor mu?
- [ ] Tüm errors logu alınıyor mu?
- [ ] Monitoring alertları var mı?

### Dependencies
- [ ] Bağımlılıklar güncel mi?
- [ ] Known vulnerabilities kontrol edildi mi?
```

## Sonuç

API güvenliği bir defaya mahsus yapılan bir iş değil. Tasarımdan başlayıp üretime kadar devam eden, sonrasında da sürekli bakım gerektiren bir süreç.

Katmanlı güvenlik yaklaşımı, düzenli monitoring ve periyodik audit'ler ile sistemlerinizi güvende tutabilirsiniz. Unutmayın ki en güvenli sistem, sürekli test edilen ve güncellenen sistemdir.
