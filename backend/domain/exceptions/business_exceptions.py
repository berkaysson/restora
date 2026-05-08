class RestoraException(Exception):
    """Tüm domain hataları için temel sınıf."""
    pass

class DocumentNotFoundException(RestoraException):
    """İstenen doküman bulunamadığında fırlatılır."""
    def __init__(self, job_id: str):
        self.message = f"Document with ID {job_id} not found."
        super().__init__(self.message)

class OCRProcessingException(RestoraException):
    """OCR işlemi sırasında bir hata oluştuğunda fırlatılır."""
    pass

class StorageException(RestoraException):
    """Dosya işlemleri sırasında bir hata oluştuğunda fırlatılır."""
    pass
