# Restora Projesi: Clean Architecture ve DDD Geçiş Planı

Restora projesinin mevcut backend yapısını inceledim. Şu anda proje, iş mantığı (business logic), veri erişimi (database/storage) ve sunum (FastAPI router'ları) katmanlarının birbirine sıkı sıkıya bağlı olduğu (tightly coupled) bir yapıya sahip. Örneğin, `app/routers/ocr.py` dosyası doğrudan dosya sistemine yazma işlemi yapıyor, iş mantığını çalıştırıyor ve veritabanı yardımcı sınıflarını (veya storage manager'ı) doğrudan çağırıyor. 

Clean Architecture (Temiz Mimari) ve Domain-Driven Design (DDD) prensiplerine geçiş yaparak projeyi test edilebilir, bakımı kolay ve ölçeklenebilir hale getireceğiz.

İşte bu geçişi adım adım ve güvenli bir şekilde sağlamak için detaylı plan:

---

## 1. Hedef Klasör Yapısı (Target Directory Structure)

Proje kök dizininde veya `backend/` altında şu katmanlı yapıyı oluşturacağız:

```text
backend/
├── domain/                 # Core iş mantığı ve kurallar (Bağımlılık YOK)
│   ├── entities/           # Document, Page, Job gibi DDD entity'leri
│   ├── value_objects/      # JobId, OCRConfidence gibi değişmez (immutable) objeler
│   ├── exceptions/         # Domain spesifik hatalar (ör. DocumentNotFoundError)
│   └── interfaces/         # Repository, Storage ve OCR Engine arayüzleri (Abstract Base Classes)
├── application/            # Use Case'ler (Uygulama iş akışları)
│   ├── use_cases/          # ProcessDocumentUseCase, UploadDocumentUseCase vb.
│   ├── dto/                # Data Transfer Object'ler (Request/Response modelleri)
│   └── interfaces/         # (Gerekirse) Application seviyesi arayüzler
├── infrastructure/         # Dış dünya ile iletişim (Veritabanı, Dosya Sistemi, Harici API)
│   ├── database/           # SQLite/SQLAlchemy Repository implementasyonları
│   ├── storage/            # LocalFileStorage (storage_manager.py'nin yeni yeri)
│   ├── ocr/                # Surya OCR entegrasyonu (engine/core.py adaptasyonu)
│   └── queue/              # RabbitMQ/Redis veya mevcut async queue implementasyonu
├── api/                    # Sunum Katmanı (Presentation)
│   ├── routers/            # FastAPI endpoint'leri (Sadece Use Case çağırır)
│   ├── dependencies.py     # Dependency Injection (DI) tanımlamaları
│   └── schemas.py          # FastAPI Pydantic modelleri
└── main.py                 # FastAPI uygulamasının başlatıldığı ve DI'ın bağlandığı yer
```

---

## 2. Aşama Aşama Geçiş Planı

### Aşama 1: Domain Katmanının İnşası (Core)
Domain katmanı projenin kalbidir ve hiçbir dış kütüphaneye (FastAPI, SQLite, Surya vb.) bağımlı olmamalıdır. Sadece saf Python (`dataclasses`, `typing` vb.) kullanılmalıdır.

1.  **Entity'leri Tanımlayın:** 
    *   `domain/entities/document.py` içine `Document` sınıfını oluşturun (`id`, `filename`, `total_pages`, `status` özelliklerini içermeli).
    *   `domain/entities/page.py` içine `Page` sınıfını oluşturun.
2.  **Interface (Port) Tanımlamaları:**
    *   `domain/interfaces/document_repository.py`: Veritabanı işlemleri için soyut sınıf (Örn: `save_document`, `get_document_by_id`).
    *   `domain/interfaces/file_storage.py`: Dosya kaydetme/okuma işlemleri için soyut sınıf.
    *   `domain/interfaces/ocr_engine.py`: OCR motorunu soyutlayan arayüz (Örn: `process_image` metodu).

### Aşama 2: Infrastructure Katmanının Adaptasyonu (Adapters)
Mevcut kodları, Domain katmanında tanımladığımız Interface'leri (Portları) implemente edecek şekilde Infrastructure katmanına taşıyıp saracağız (Wrapper/Adapter pattern).

1.  **Database Adaptörü:** `db_helpers.py` dosyasındaki SQL sorgularını alıp `infrastructure/database/sqlite_document_repository.py` içinde, `IDocumentRepository` arayüzünü uygulayan bir sınıfa (`SqliteDocumentRepository`) taşıyın. *(İleride SQLAlchemy ORM'e geçmek isterseniz sadece bu dosyayı değiştireceksiniz).*
2.  **Storage Adaptörü:** `storage_manager.py` kodlarını `infrastructure/storage/local_file_storage.py` içine taşıyıp `IFileStorage` arayüzünü uygulamasını sağlayın.
3.  **OCR Adaptörü:** `engine/` dizinindeki kodları bir sınıfa (örn. `SuryaOCREngine`) sarın ve `IOCREngine` arayüzünü uygulayın.

### Aşama 3: Application Katmanının Geliştirilmesi (Use Cases)
Mevcut durumda router'lar (`app/routers/ocr.py`) ve `utils.py` içinde yer alan iş mantığını (örneğin dosya yükleme, OCR başlatma, JSON kaydetme akışını) Use Case sınıflarına taşıyacağız.

1.  **UploadDocumentUseCase:**
    *   *Girdi:* Dosya adı ve dosya içeriği (byte/stream).
    *   *İşlem:* Storage arayüzünü kullanarak dosyayı kaydeder, Repository arayüzünü kullanarak Document entity'sini veritabanına 'pending' statüsünde kaydeder, Queue arayüzüne işi atar.
    *   *Çıktı:* Oluşturulan Document'ın ID'si.
2.  **ProcessDocumentUseCase:**
    *   *Girdi:* Job ID (Document ID).
    *   *İşlem:* Repository'den dokümanı çeker -> Status'u 'processing' yapar -> OCR arayüzünü çağırır -> Gelen sonucu Storage'a JSON olarak yazar -> Status'u 'completed' yapar ve Repository'de günceller.

### Aşama 4: Presentation Katmanı (API & Routers) Düzenlemesi
FastAPI router'ları artık sadece HTTP isteklerini alacak, parametreleri doğrulayacak ve ilgili Use Case'i çalıştıracaktır.

1.  **Dependency Injection (DI) Kurulumu:** `api/dependencies.py` içinde Repository, Storage ve Use Case nesnelerini üreten FastAPI `Depends` fonksiyonları yazın.
    *   *Örnek:* `def get_upload_use_case() -> UploadDocumentUseCase:`
2.  **Router Refactoring:** `app/routers/ocr.py` dosyasındaki karmaşık mantığı silin. Yerine, enjekte edilen Use Case nesnesini çağırın.
    *   *Örnek Akış:* `router.post("/upload")` -> Request'i al -> `use_case.execute(file)` -> Response dön.

---

## 3. Güvenli Geçiş (Migration) Stratejisi

Bütün projeyi tek seferde silip baştan yazmak (**Big Bang Rewriting**) çok risklidir. Bunun yerine **Strangler Fig Pattern** (Boğucu İncir Deseni) uygulamalıyız:

1.  **Önce Klasörleri Açın:** Yeni klasör yapısını (`domain/`, `application/` vb.) mevcut kodun yanına boş olarak açın.
2.  **Aşağıdan Yukarıya Doğru İnşa Edin:** Önce sadece Domain entity'lerini ve Interface'leri yazın.
3.  **Parça Parça Taşıyın:** Örneğin, sadece `GET /list-uploads` (listeleme) işlemini yeni mimariye geçirin. Router -> Use Case -> Repository (Interface) -> SqliteRepository (Implementation) zincirini bu tek endpoint için kurun ve test edin.
4.  **En Karmaşık Yeri Sona Bırakın:** `POST /upload` ve asenkron OCR işleme (`process_ocr_and_spellcheck` ve queue yapısı) kısmı en karmaşık yerdir. Listeleme ve silme endpoint'leri yeni yapıya geçtikten sonra bu ana akışı Use Case'lere bölün.
5.  **Eski Kodları Temizleyin:** Her şey yeni mimariye uyarlandıktan sonra eski `db_helpers.py`, `app/utils.py`, `storage_manager.py` gibi root dizindeki dosyaları güvenle silin.

Bu adımları onaylıyorsanız, ilk olarak **Aşama 1 (Domain Katmanı)** kodlarını yazmaya başlayabiliriz. Lütfen bana hangi adımdan başlamak istediğinizi bildirin.
