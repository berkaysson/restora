class InfrastructureException(Exception):
    """Infrastructure katmanındaki genel hatalar için temel sınıf."""
    pass

class DatabaseException(InfrastructureException):
    """Veritabanı işlemleri sırasında oluşan hatalar."""
    pass

class StorageException(InfrastructureException):
    """Dosya sistemi işlemleri sırasında oluşan hatalar."""
    pass

class OCREngineException(InfrastructureException):
    """OCR motoru işlemleri sırasında oluşan hatalar."""
    pass
