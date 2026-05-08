# Restora Backend: Clean Architecture & DDD Dokümantasyonu

Bu dosya, projenin Clean Architecture ve Domain-Driven Design (DDD) prensiplerine göre yeniden yapılandırılma sürecini ve güncel durumunu takip eder.

## 1. Mimari Yapı (Target Structure)

```text
backend/
├── domain/                 # Core iş mantığı ve kurallar (Bağımlılık YOK)
│   ├── entities/           # DDD entity'leri (Document, Page)
│   ├── value_objects/      # Değişmez objeler (Status, OCRResult)
│   ├── exceptions/         # Domain spesifik hatalar
│   └── interfaces/         # Soyut arayüzler (Repository, Storage, OCR Engine)
├── application/            # Use Case'ler (Uygulama iş akışları)
│   ├── use_cases/          # İş mantığı orkestrasyonu
│   ├── dto/                # Veri transfer objeleri
│   └── interfaces/         # Uygulama seviyesi arayüzler
├── infrastructure/         # Dış dünya ile iletişim (Adapter'lar)
│   ├── database/           # SQLite/Repository implementasyonları
│   ├── storage/            # Dosya sistemi implementasyonları
│   ├── ocr/                # OCR motoru adaptörleri
│   └── queue/              # Mesaj kuyruğu yönetimi
├── api/                    # Sunum Katmanı (Presentation)
│   ├── routers/            # FastAPI endpoint'leri
│   ├── dependencies.py     # Dependency Injection tanımları
│   └── schemas.py          # Pydantic modelleri
└── main.py                 # Uygulama giriş noktası
```

## 2. Mevcut Durum ve Tamamlanan Adımlar

### [Aşama 1] Domain Katmanı (Tamamlandı)
Projenin kalbi olan Domain katmanı, hiçbir dış kütüphaneye bağımlı kalmadan inşa edildi.

#### Tamamlanan Dosyalar ve Tanımlar:
- **Entities:**
    - `Document`: Ana aggregate root. Dokümanın tüm hayat döngüsünü (pending, processing, completed) yönetir.
    - `Page`: Dokümana ait her bir sayfanın verisini ve durumunu tutar.
- **Value Objects:**
    - `DocumentStatus`: İşlem durumlarını (Enum) belirler.
    - `OCRResult`: Metin, güven skoru ve işlem süresini paketler.
    - `LayoutData`: Sayfanın genişlik, yükseklik ve koordinat bloklarını saklar.
- **Interfaces (Ports):**
    - `IDocumentRepository`: Veri tabanı işlemleri için soyut tanım.
    - `IFileStorage`: Dosya saklama ve klasör yönetimi için soyut tanım.
    - `IOCREngine`: OCR işleme süreci için soyut tanım.
- **Exceptions:**
    - `BusinessExceptions`: `DocumentNotFoundException`, `OCRProcessingException` gibi iş mantığına özgü hata tanımları.

### [Aşama 2] Infrastructure Katmanı (Tamamlandı)
Domain katmanında tanımlanan soyut arayüzlerin (interfaces) gerçek dünya implementasyonları gerçekleştirildi.

#### Tamamlanan Dosyalar ve Tanımlar:
- **Database Adapter:**
    - `DatabaseMapper`: Veritabanı satırları ile Domain Entity'leri arasındaki dönüşümü sağlar.
    - `SqliteDocumentRepository`: `IDocumentRepository` arayüzünü SQLite üzerinden implemente eder. Doküman ve sayfa bazlı veri yönetimini (save, get, list, delete) gerçekleştirir.
- **Storage Adapter:**
    - `LocalFileStorage`: `IFileStorage` arayüzünü yerel dosya sistemi üzerinde implemente eder. `uploads/` dizini altında iş bazlı (job-based) klasör ve dosya yönetimini sağlar.
- **OCR Engine Adapter:**
    - `SuryaOCREngine`: `IOCREngine` arayüzünü mevcut Surya OCR kütüphanesi (`engine/core.py`) üzerinden implemente eder.
- **Infrastructure Exceptions:**
    - `InfrastructureException`: Altyapı seviyesindeki hataları (DB, Storage, OCR) temsil eder.

### [Aşama 3] Application Katmanı (Tamamlandı)
Uygulamanın iş akışları (Use Case'ler) ve veri transfer objeleri (DTO'lar) dış dünya teknolojilerinden bağımsız olarak oluşturuldu. Sistemin eski tek sayfa (single-page) davranışı korundu.

#### Tamamlanan Dosyalar ve Tanımlar:
- **DTOs (Data Transfer Objects):**
    - `DocumentDTO`, `PageDTO`: Domain entity'lerini API'ye sunmak için kullanılan Pydantic modelleri.
    - `ProcessDocumentRequest`: API'den gelecek basit istek modeli.
- **Use Cases:**
    - `UploadDocumentUseCase`: Dosya yükleme, `job_id` oluşturma, dosyayı kaydetme ve DB'ye başlangıç kaydını atma işlemlerini orkestre eder. Eski mimariyle uyumlu olması için sayfa sayısı `1` olarak sabitlendi.
    - `ProcessDocumentUseCase`: Dokümanın işleme döngüsünü yönetir. `IOCREngine`'i çağırır, çıkan sonucu `.json` olarak saklar ve DB'deki statüleri günceller.
    - `ListDocumentsUseCase`: Tüm dokümanları Repository üzerinden çekip DTO listesine çevirir.
    - `GetDocumentUseCase`: Belirli bir dokümanın detayını getirir.
    - `DeleteDocumentUseCase`: Fiziksel dosyaları (Storage) ve DB kayıtlarını (Repository) siler.

> [!NOTE]
> Eski `app/utils.py` içinde bulunan `process_ocr_and_spellcheck` altındaki yazım denetimi (Spellcheck) mantığı, bu aşamada bilinçli olarak atlanmış olup ileride ayrı bir servis olarak tasarlanacaktır.

## 3. Gelecek Adımlar (Roadmap)

1. **Asenkron Kuyruk (Task Queue) Entegrasyonu:** Domain katmanına `ITaskQueue` arayüzünün eklenmesi. Eski güçlü `queue_manager.py` altyapısının Infrastructure katmanına bir adaptör olarak taşınıp veritabanı bağımlılıklarından arındırılması.
2. **Gerçek Çoklu Sayfa (Multi-Page) Desteği:** `UploadDocumentUseCase`'in PDF sayfa sayısını tekrar otomatik bulacak şekilde güncellenmesi ve her sayfa için kuyruğa iş atması. `ProcessDocumentUseCase` yerine sayfa bazlı çalışan `ProcessPageUseCase`'in yazılması. Böylece `preprocessor.extract_pdf_page` yardımıyla her sayfanın bağımsız ve paralel işlenebilmesi.
3. **Eksik Use Case'lerin Tamamlanması:** Eski yapıda bulunan varolan dokümanları yeniden işleme özelliği (`process-existing`) için `ReprocessDocumentUseCase`'in yazılması.
4. **API (Presentation) Katmanı ve DI:** Mevcut karmaşık FastAPI router'larının (`ocr.py`, `pdf.py`) tamamen silinip, yeni Use Case'lerin enjekte edileceği (Dependency Injection) temiz endpoint'lerin oluşturulması.
