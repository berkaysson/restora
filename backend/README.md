# Restora Backend: Clean Architecture & DDD

Restora, çok sayfalı PDF ve resim belgeleri üzerinde yüksek doğruluklu metin tanıma (OCR) ve sayfa mizanpaj analizi (Layout Analysis) gerçekleştiren, arka planda asenkron kuyruk yapısı barındıran ve anlık durum güncellemelerini WebSocket üzerinden istemcilere ileten modern bir backend uygulamasıdır.

Bu proje, **Domain-Driven Design (DDD)** ve **Clean Architecture (Temiz Mimari)** prensipleri doğrultusunda tamamen yeniden yapılandırılmıştır.

---

## 🚀 Öne Çıkan Özellikler

- **Çoklu Sayfa Desteği & Asenkron Kuyruk:** Yüklenen PDF veya resim dosyaları arka planda asyncio tabanlı bir kuyruk sistemi (`AsyncProcessingQueue`) ile paralel ve sıralı olarak sayfa bazında işlenir.
- **Gerçek Zamanlı Durum Bildirimi:** Her bir sayfanın işleme durumu (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`) anlık olarak WebSocket (`/api/v2/ws/progress/{job_id}`) üzerinden frontend uygulamasına iletilir.
- **Canlı Sistem Logları:** Sunucu tarafında üretilen tüm sistem logları anlık olarak `/api/v2/ws/logs` WebSocket kanalı üzerinden frontend izleme paneline akıtılır.
- **Surya OCR Entegrasyonu:** Mizanpaj analizi ve yüksek kaliteli metin okuma süreçleri Surya OCR kütüphanesi yardımıyla yerel olarak yürütülür.
- **Temiz ve Modüler Altyapı:** İş mantığı, dış bileşenlerden (FastAPI, SQLite, Surya vb.) tamamen izole edilmiştir.

---

## 🛠️ Teknoloji Yığını

*   **Çekirdek:** Python 3.10+
*   **Web Framework:** [FastAPI](https://fastapi.tiangolo.com/) & Uvicorn
*   **Veritabanı:** SQLite & `sqlite3` (Optimize edilmiş yerel veri tabanı)
*   **OCR & Layout:** Surya OCR
*   **Eşzamansız Görevler:** Python standard `asyncio.Queue`
*   **Real-time:** WebSockets

---

## 📁 Mimari Katmanlar ve Klasör Yapısı

Proje, bağımlılıkların her zaman iç halkaya (Domain) doğru aktığı Clean Architecture yapısına sahiptir:

```text
backend/
├── domain/                 # 1. Çekirdek İş Mantığı (Core Domain)
│   ├── entities/           # Document, Page entity'leri
│   ├── value_objects/      # Değişmez kavramlar (Durumlar, OCRResult vb.)
│   ├── exceptions/         # Domain katmanına özel iş mantığı hataları
│   └── interfaces/         # Soyut Portlar (Repository, Storage, OCR Engine vb.)
├── application/            # 2. Uygulama Mantığı (Use Cases)
│   ├── use_cases/          # İş Akışları (Upload, Process, Delete vb.)
│   ├── dto/                # Data Transfer Objects (Pydantic modelleri)
│   └── interfaces/         # Uygulama düzeyindeki soyutlamalar
├── infrastructure/         # 3. Dış Dünya Adaptörleri (Adapters)
│   ├── database/           # SQLite repository implementasyonu ve mappers
│   ├── storage/            # Yerel dosya depolama yönetimi
│   ├── ocr/                # Surya OCR entegrasyon sınıfı
│   ├── queue/              # Asenkron worker kuyruk sistemi
│   └── notifications/      # WebSocket tabanlı anlık bildirim servisi
├── api/                    # 4. Sunum Katmanı (FastAPI Presentation)
│   ├── routers/            # Endpoint yönlendiricileri (ocr, documents, logs, websocket)
│   ├── dependencies.py     # Bağımlılık Enjeksiyonu (DI) merkezi
│   └── router.py           # Birleştirilmiş ana yönlendirici
├── database.py             # SQLite tablo şemaları ve bağlantı yönetimi
├── logger.py               # WebSocket destekli log yöneticisi (LogManager)
└── main.py                 # FastAPI uygulaması başlangıç ve kapatma olayları
```

---

## ⚙️ Kurulum ve Çalıştırma

### 1. Gereksinimler
Sisteminizde **Python 3.10** veya daha yeni bir sürümün kurulu olduğundan emin olun.

### 2. Sanal Ortam Oluşturma ve Aktifleştirme
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Bağımlılıkların Yüklenmesi
```bash
pip install -r requirements.txt
```

### 4. Uygulamanın Başlatılması
```bash
uvicorn main:app --reload
```
Uygulama varsayılan olarak **http://localhost:8000** adresinde çalışmaya başlayacaktır.

---

## 📡 API Uç Noktaları (Endpoints)

Tüm yeni API uç noktaları `/api/v2` ön eki ile sunulmaktadır:

### Doküman Yönetim API'leri
- `POST /api/v2/ocr/upload` - Çok sayfalı belge yükleme ve asenkron OCR kuyruğunu tetikleme.
- `GET /api/v2/ocr/list-uploads` - Yüklenen ve işlenmekte olan tüm işlerin listesi.
- `DELETE /api/v2/ocr/delete-upload/{job_id}` - Fiziksel dosyalar ve veritabanı kayıtları dahil olmak üzere bir işi silme.
- `POST /api/v2/ocr/process-existing/{job_id}` - Mevcut bir belgeyi sıfırlayıp kuyruğa yeniden ekleme.

### Veri ve Sorgu API'leri
- `GET /api/v2/documents` - Tüm işlenmiş dokümanların listesi.
- `GET /api/v2/documents/{job_id}` - Belirli bir dokümanın tüm detayları ve durum bilgisi.
- `GET /api/v2/documents/{job_id}/pages` - Dokümana ait tüm sayfaların detayları (OCR metinleri ve mizanpaj koordinatları dahil).

### WebSocket Bağlantıları
- `WS /api/v2/ws/progress/{job_id}` - Belirli bir dokümanın sayfa sayfa işleme ilerlemesini anlık takip etme.
- `WS /api/v2/ws/logs` - Tüm sistem ve sunucu loglarını canlı olarak dinleme.

---

## 🧪 Birim Testleri ve Geliştirme

Clean Architecture yapısı sayesinde uygulamanın tüm use case'leri (iş akışları) sahte adaptörler (Mock/Fake Repository, Mock Storage) kullanılarak veritabanı bağlantısı veya Surya OCR kütüphanesine ihtiyaç duyulmadan saniyeler içerisinde test edilebilir.

Yeni bir servis, OCR kütüphanesi veya veritabanı altyapısı entegre etmek için sadece `domain/interfaces` altında tanımlanan soyut arayüzü implemente etmeniz ve bunu `api/dependencies.py` üzerinden sisteme enjekte etmeniz yeterlidir.
