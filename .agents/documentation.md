# Restora Backend: Clean Architecture & DDD Dokümantasyonu

Bu doküman, Restora projesinin Clean Architecture (Temiz Mimari) ve Domain-Driven Design (DDD) prensiplerine göre yapılandırılmış backend mimarisini, katmanlarını, bileşenlerini ve veri akış modellerini detaylandırmak amacıyla hazırlanmış teknik başvuru kılavuzudur.

---

## 1. Mimari Prensipler ve Tasarım

Restora backend sistemi, **Clean Architecture** ve **Domain-Driven Design (DDD)** felsefesini esas alır. Bu mimarinin temel amacı; iş mantığını (business logic) veritabanlarından, web çerçevelerinden (FastAPI), harici OCR kütüphanelerinden (Surya) ve diğer tüm altyapı detaylarından tamamen bağımsız ve soyut tutmaktır.

### Ana Kurallar:

1.  **Bağımlılık Yönü (Dependency Rule):** Bağımlılıklar her zaman içeriye doğru akar. Domain katmanı en içeridedir ve dışındaki hiçbir katmandan (Application, Infrastructure, API) haberdar değildir.
2.  **Arayüzlerle Ayrıştırma (Port & Adapter):** Domain katmanı, ihtiyaç duyduğu servisleri soyut arayüzler (Interfaces / Ports) olarak tanımlar. Bu arayüzlerin somut implementasyonları (Adapters) ise Infrastructure katmanında yer alır.
3.  **Tek Sorumluluk İlkesi (Single Responsibility):** Her use case (kullanım senaryosu) yalnızca tek bir iş akışını orkestre etmekten sorumludur.

---

## 2. Detaylı Dosya ve Klasör Yapısı

Sistemin güncel dosya dağılımı aşağıdaki gibidir:

```text
backend/
├── domain/                         # Çekirdek İş Mantığı (Core Domain)
│   ├── entities/                   # Durum ve İş Mantığı Barındıran Sınıflar
│   │   ├── document.py             # Document Aggregate Root
│   │   └── page.py                 # Page Entity nesnesi
│   ├── value_objects/              # Değişmez Kavramlar ve Tipler
│   │   ├── document_status.py      # Durum Enum Tanımları (PENDING, PROCESSING, vb.)
│   │   └── ocr_result.py           # OCRResult ve LayoutData yapıları
│   ├── exceptions/                 # Hata Tipleri
│   │   └── business_exceptions.py  # İş kuralları ihlallerinde fırlatılan hatalar
│   └── interfaces/                 # Portlar (Soyut Arayüzler)
│       └── __init__.py             # IDocumentRepository, IFileStorage, IOCREngine vb.
│
├── application/                    # Uygulama Mantığı (Use Cases)
│   ├── use_cases/                  # İş Akışlarının Orkestrasyonu
│   │   ├── upload_document.py      # Doküman yükleme ve başlatma akışı
│   │   ├── process_page.py         # Tek sayfanın OCR süreçlerini yürütme
│   │   ├── reprocess_document.py   # Mevcut dokümanı sıfırlayıp yeniden sıraya alma
│   │   ├── get_document.py         # Tek bir dokümanın detayını sorgulama
│   │   ├── list_documents.py       # Dokümanları listeleme
│   │   └── delete_document.py      # Doküman silme (dosyalar ve DB dahil)
│   ├── dto/                        # Data Transfer Objects (Veri Taşıma Şablonları)
│   │   ├── document_dto.py         # Document, Page, OCRResult Pydantic şemaları
│   │   └── request_dto.py          # İstek gövdesi şemaları
│   └── interfaces/                 # Application seviyesindeki soyutlamalar
│
├── infrastructure/                 # Dış Teknoloji Adaptörleri (Adapters)
│   ├── database/                   # Veritabanı Erişim Katmanı
│   │   ├── sqlite_document_repository.py # IDocumentRepository SQLite implementasyonu
│   │   └── mappers.py              # DB satırları ve Domain Entity'leri arasında dönüşüm
│   ├── storage/                    # Dosya Depolama Sistemi
│   │   └── local_file_storage.py   # IFileStorage Yerel Dosya Sistemi implementasyonu
│   ├── ocr/                        # OCR Motoru Adaptörü
│   │   └── surya_ocr_engine.py     # IOCREngine Surya OCR implementasyonu
│   ├── queue/                      # Görev Kuyruğu (Task Queue)
│   │   └── async_processing_queue.py # ITaskQueue asenkron worker kuyruğu
│   ├── notifications/              # Bildirim ve Yayın Adaptörü
│   │   └── websocket_notification_service.py # INotificationService WebSocket implementasyonu
│   └── exceptions.py               # Altyapı seviyesindeki hatalar
│
├── api/                            # Sunum Katmanı (Presentation)
│   ├── routers/                    # FastAPI Yönlendiricileri
│   │   ├── ocr.py                  # Yükleme, silme ve yeniden işleme API'leri
│   │   ├── documents.py            # Sorgulama API'leri
│   │   ├── websocket.py            # Sayfa ilerleme durumunu bildiren WS uç noktası
│   │   └── logs.py                 # Canlı sistem loglarını yayınlayan WS uç noktası
│   ├── dependencies.py             # Dependency Injection (DI) Fabrika Fonksiyonları
│   └── router.py                   # Tüm API yönlendiricilerinin birleştirildiği yer
│
├── database.py                     # SQLite tablo şemaları ve bağlantı yönetimi
├── logger.py                       # Sistem geneli log yöneticisi (LogManager)
└── main.py                         # FastAPI uygulamasının başlatılması ve olay yönetimi
```

---

## 3. Katmanların Detaylı İncelenmesi

### 3.1. Domain Katmanı (domain/)

Dış dünyaya ait hiçbir bağımlılığı yoktur. Sadece saf Python dil özelliklerini kullanır.

- **Document Entity (domain/entities/document.py):**
  Sistemin ana agregasyon köküdür (Aggregate Root). Bir dokümanın kimliğini, yüklenen orijinal dosya adını, toplam sayfa sayısını, işlenen sayfa sayısını, genel durumunu ve o dokümana ait tüm `Page` nesnelerini içinde barındırır.
- **Page Entity (domain/entities/page.py):**
  Tek bir sayfanın bilgilerini, durumunu, oluşturulan sayfa görseli yolunu, hata mesajını ve sayfanın OCR sonuçlarını (`ocr_result`, `layout_data`) tutar.
- **Interfaces (domain/interfaces/**init**.py):**
  - `IDocumentRepository`: Veritabanı okuma, yazma, güncelleme ve silme işlevlerini tanımlar.
  - `IFileStorage`: Fiziksel PDF dosyalarının, dönüştürülen sayfa görsellerinin ve çıkartılan JSON çıktılarının depolanmasını soyutlar.
  - `IOCREngine`: Tek bir sayfa görseli üzerinde OCR ve mizanpaj analizi yapılmasını soyutlar.
  - `ITaskQueue`: Dokümanın sayfalarını arka planda asenkron işlemek üzere kuyruğa ekleme ve iptal etme işlemlerini tanımlar.
  - `INotificationService`: İşlem süreçlerindeki anlık güncellemeleri istemcilere bildirmek için kullanılır.

### 3.2. Application Katmanı (application/)

Uygulama kullanım senaryolarını barındırır. İş akışlarını orkestre etmek için sadece Domain entity'lerini ve soyut Port arayüzlerini kullanır.

- **UploadDocumentUseCase:**
  1.  Dosya adı ve içeriğini (bytes) alır.
  2.  Benzersiz bir `job_id` (UUID) üretir.
  3.  `IFileStorage` ile dosyayı kaydeder.
  4.  PDF'in toplam sayfa sayısını analiz eder.
  5.  Bir `Document` entity'si oluşturup, altındaki sayfaları `PENDING` durumuyla hazırlar ve `IDocumentRepository.save` ile veritabanına kaydeder.
  6.  Her bir sayfayı işlenmek üzere `ITaskQueue` kuyruğuna gönderir.
- **ProcessPageUseCase:**
  Arka planda çalışan kuyruk worker'ı tarafından tetiklenir.
  1.  Eğer işlenen dosya bir PDF ise ilgili sayfayı yüksek kaliteli bir görsele (PNG) dönüştürür.
  2.  Sayfa durumunu `PROCESSING` yapar ve `INotificationService` ile UI'a bildirir.
  3.  `IOCREngine.process_page` metodunu çağırarak metinleri ve sayfa koordinatlarını (layout) çıkarır.
  4.  Elde edilen JSON çıktısını `IFileStorage` kullanarak kaydeder.
  5.  Sayfa durumunu `COMPLETED` olarak günceller ve veri tabanına kaydeder.
  6.  Dokümanın toplam ilerlemesini hesaplar. Tüm sayfalar bittiğinde doküman durumunu `COMPLETED` yapar.
  7.  Her adımda WebSocket bildirim servisi üzerinden güncel durumu yayınlar.
- **ReprocessDocumentUseCase:**
  Mevcut bir dokümanı sıfırlayıp tekrar kuyruğa ekleyerek yeniden işleme sürecini baştan başlatır. Doküman ve sayfa durumlarını veritabanında `PENDING` yapar ve tüm sayfaları yeniden asenkron görev kuyruğuna ekler.

### 3.3. Infrastructure Katmanı (infrastructure/)

Domain ve Application katmanlarında tanımlanan tüm soyut arayüzlerin somut implementasyonlarını içerir.

- **SqliteDocumentRepository:**
  `IDocumentRepository` arayüzünü SQLite üzerinden implemente eder. SQL sorgularını yönetir. Sayfa güncellemelerinde N+1 sorgu problemini engellemek için `save_page` ve `update_document_progress` gibi optimize edilmiş atomik metotlar barındırır.
- **DatabaseMapper:**
  Veritabanından dönen ham satır yapılarını (`sqlite3.Row`) Domain katmanındaki `Document` ve `Page` sınıflarına; ya da tam tersine dönüştürür. Böylece veri tabanı şemasındaki değişiklikler sadece mapper seviyesinde izole edilir.
- **LocalFileStorage:**
  Sisteme yüklenen tüm dosyaları `uploads/{job_id}/` yapısında organize eder. Sayfa görsellerini ve OCR JSON sonuçlarını yerel disk üzerinde saklar.
- **SuryaOCREngine:**
  Gelişmiş Surya OCR ve Layout algoritmalarını sarmalar. Girdi resmini işleyerek domain uyumlu `OCRResult` ve `LayoutData` nesnelerine dönüştürür.
- **AsyncProcessingQueue:**
  `ITaskQueue` arayüzünün `asyncio.Queue` tabanlı implementasyonudur. Uygulama başlatılırken (`startup_event`) arka planda çalışacak eşzamanlı worker'ları ayağa kaldırır. Kuyruktan görevleri alıp `ProcessPageUseCase` yardımıyla paralel işler.
- **WebSocketNotificationService:**
  FastAPI WebSocket bağlantılarını yönetir. İstemciler `/api/v2/ws/progress/{job_id}` adresine bağlanarak dokümanın sayfa sayfa işlenme ilerlemesini anlık JSON formatında alırlar.

### 3.4. API (Presentation) Katmanı (api/)

Web isteklerini alan, doğrulayan ve ilgili Use Case'i tetikleyen FastAPI katmanıdır.

- **Dependency Injection (api/dependencies.py):**
  `get_repository()`, `get_storage()`, `get_task_queue()` gibi fabrika fonksiyonları aracılığıyla somut sınıfların (adapters) singleton örneklerini oluşturur ve Use Case sınıflarına enjekte eder. FastAPI endpoint'leri sadece `Depends(get_upload_use_case)` gibi DI çağrıları yapar.
- **Yönlendiriciler (routers/):**
  - `ocr.py`: Yükleme, listeleme, silme ve yeniden tetikleme API uç noktaları.
  - `documents.py`: Belgeleri ve bunlara ait sayfaları sorgulayan sorgu (Read) API uç noktaları.
  - `websocket.py`: İlerleme durumu yayını yapan WebSocket sunucusu.
  - `logs.py`: Sistem genelinde `logger.py` tarafından üretilen logları anlık olarak tarayıcıya yayınlayan WebSocket sunucusu.

---

## 4. Sistem Çalışma Akışları (Veri Akışı)

### 4.1. Yeni Belge Yükleme ve İşleme Akışı

```text
[Kullanıcı / Tarayıcı]
       │
       │ 1. POST /api/v2/ocr/upload (Multipart File)
       ▼
┌────────────────────────────────────────────────────────┐
│ FastAPI Router (api/routers/ocr.py)                    │
│  └─ Enjekte edilen: UploadDocumentUseCase              │
└───────────────────┬────────────────────────────────────┘
                    │
                    │ 2. execute(filename, file_bytes)
                    ▼
┌────────────────────────────────────────────────────────┐
│ UploadDocumentUseCase                                  │
│  ├─ 3. IFileStorage.save_file() -> Diske Kayıt         │
│  ├─ 4. PDF sayfa sayısını oku                         │
│  ├─ 5. Document & Page domain varlıklarını yarat       │
│  ├─ 6. IDocumentRepository.save() -> DB'ye kaydet      │
│  └─ 7. ITaskQueue.enqueue_page() -> Sayfaları sıraya at│
└───────────────────┬────────────────────────────────────┘
                    │
                    │ 8. Arka Planda Asenkron Tetikleme
                    ▼
┌────────────────────────────────────────────────────────┐
│ Görev İşleyici Worker (AsyncProcessingQueue)           │
│  └─ Tetiklenen: ProcessPageUseCase                     │
└───────────────────┬────────────────────────────────────┘
                    │
                    │ 9. execute(job_id, page_number)
                    ▼
┌────────────────────────────────────────────────────────┐
│ ProcessPageUseCase                                     │
│  ├─ 10. PDF sayfasını PNG'ye çevir ve kaydet           │
│  ├─ 11. Sayfa durumunu 'PROCESSING' yap & WS'den yay   │
│  ├─ 12. IOCREngine.process_page() -> Surya OCR çalıştır│
│  ├─ 13. Çıktı JSON dosyasını diske yaz                 │
│  ├─ 14. Sayfayı ve Doküman ilerlemesini DB'de güncelle │
│  └─ 15. İlerleme durumunu WS üzerinden yayınla         │
└────────────────────────────────────────────────────────┘
```

---

## 5. Mimarinin Sağladığı Avantajlar

Uygulanan bu yeni Clean Architecture ve DDD mimarisi projeye şu somut yararları sağlamıştır:

> [!TIP]
> **Esneklik:** İleride SQLite yerine PostgreSQL veya MongoDB gibi farklı bir veritabanına geçilmek istendiğinde, sadece `SqliteDocumentRepository` yerine yeni bir adaptör yazılması yeterlidir. Domain ve Application katmanlarındaki tek bir satır kod bile değişmez.

> [!NOTE]
> **Test Edilebilirlik:** İş mantığı (Use Case'ler) harici hiçbir veritabanı veya OCR kütüphanesine doğrudan bağlı olmadığından, sahte nesneler (Mock/Fake Repository, Mock Storage) kullanılarak saniyeler içerisinde birim testlere (Unit Tests) tabi tutulabilir.

> [!IMPORTANT]
> **Paralel ve Güvenli İşleme:** Çoklu sayfa işlemeleri asenkron bir worker kuyruğuna (`AsyncProcessingQueue`) devredildiği için API istekleri anında yanıtlanır (`job_id` döner) ve sunucu kilitlenmeden sayfalar arka planda sırayla işlenir. Bu esnada WebSocket üzerinden sayfa bazında ilerleme takibi yapılabilir.
