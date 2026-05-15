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
- **Queue Adapter:**
    - `AsyncProcessingQueue`: `ITaskQueue` arayüzünü implemente eder. `asyncio.Queue` kullanarak sayfaları arka planda paralel (max_concurrent) işler.

### [Aşama 3] Application Katmanı (Tamamlandı)
Uygulamanın iş akışları (Use Case'ler) ve veri transfer objeleri (DTO'lar) dış dünya teknolojilerinden bağımsız olarak oluşturuldu. Gerçek çoklu sayfa (multi-page) ve asenkron kuyruk desteği entegre edildi.

#### Tamamlanan Dosyalar ve Tanımlar:
- **DTOs (Data Transfer Objects):**
    - `DocumentDTO`, `PageDTO`: Domain entity'lerini API'ye sunmak için kullanılan Pydantic modelleri.
    - `ProcessDocumentRequest`: API'den gelecek basit istek modeli.
- **Use Cases:**
    - `UploadDocumentUseCase`: Dosya yükleme, `job_id` oluşturma, gerçek sayfa sayısını tespit etme, sayfaları DB'ye kaydetme ve `ITaskQueue` üzerinden işleme döngüsünü başlatma işlemlerini orkestre eder.
    - `ProcessPageUseCase`: Kuyruktan gelen tek bir sayfayı işlemeyi yönetir. PDF ise sayfayı resme çevirir, OCR motorunu çağırır, JSON sonuçlarını kaydeder ve durumu günceller.
    - `ListDocumentsUseCase`: Tüm dokümanları Repository üzerinden çekip DTO listesine çevirir.
    - `GetDocumentUseCase`: Belirli bir dokümanın detayını getirir.
    - `DeleteDocumentUseCase`: Fiziksel dosyaları (Storage) ve DB kayıtlarını (Repository) siler.
    - `ReprocessDocumentUseCase`: Mevcut bir dokümanı sıfırdan yeniden işler. Dokümanı ve sayfaları `pending` durumuna sıfırlar, ardından `ITaskQueue` üzerinden tüm sayfaları yeniden kuyruğa ekler. Eski `POST /process-existing/{job_id}` endpoint mantığının Clean Architecture versiyonu.

> [!NOTE]
> Eski `app/utils.py` içinde bulunan `process_ocr_and_spellcheck` altındaki yazım denetimi (Spellcheck) mantığı, bu aşamada bilinçli olarak atlanmış olup ileride ayrı bir servis olarak tasarlanacaktır.

## 3. Gelecek Adımlar (Roadmap)

1. **API (Presentation) Katmanı ve DI:** Mevcut karmaşık FastAPI router'larının (`ocr.py`, `pdf.py`) tamamen silinip, yeni Use Case'lerin enjekte edileceği (Dependency Injection) temiz endpoint'lerin oluşturulması.
2. **App Startup:** Uygulama başlatılırken `AsyncProcessingQueue` worker'larının start edilmesi.
3. **Cleanup:** Yeni yapı tam entegre edildikten sonra eski `db_helpers.py`, `storage_manager.py` ve `queue_manager.py` gibi dosyaların temizlenmesi.
