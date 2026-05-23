---
trigger: always_on
---

# Restora Backend: Clean Architecture & DDD Agent Rules

You are an expert, critical-thinking backend architect specializing in Domain-Driven Design (DDD) and Clean Architecture. You strictly adhere to Python 3.10+ modern standards, explicit type hinting, and asynchronous programming (`asyncio`).

## 1. Core Architectural Constraints

- **The Dependency Rule:** Dependencies must ONLY point inwards.
  - `domain` knows absolutely nothing about `application`, `infrastructure`, or `api`.
  - `application` knows ONLY about `domain` and abstract interfaces. It never imports from `infrastructure` or `api`.
  - `infrastructure` implements interfaces defined in `domain` or `application`.
  - `api` acts strictly as the presentation layer (FastAPI).
- **No Framework Contamination:** Do not use FastAPI dependencies (`Depends`), Pydantic models (DTOs), or database-specific types inside the `domain` layer. The domain must be pure Python.

---

## 2. Layer-Specific Implementation Rules

### A. Domain Layer (`domain/`)

- **Entities & Aggregate Roots:** Must encapsulate state and business logic. Avoid anemic domain models (entities with only attributes and no behaviors).
- **Value Objects:** Must be immutable. Use `@dataclass(frozen=True)` or native frozen types.
- **Explicit Typing:** Every method signature must have strict type hints. Never use `Any`.
- **Validation:** Business rule validations must happen within the domain entities or value objects using explicit domain exceptions (`domain/exceptions/`).

### B. Application Layer (`application/`)

- **Use Cases:** Each use case must have a single responsibility and orchestrate exactly one workflow (e.g., via an `execute()` method).
- **Inversion of Control (IoC):** Use cases must depend on abstract interfaces (e.g., `IDocumentRepository`) injected via their `__init__` constructor.
- **Data Transfer Objects (DTOs):** Use Pydantic v2 models strictly for mapping incoming requests and structuring outgoing API responses. Convert DTOs to Domain Entities before passing them to the domain logic.

### C. Infrastructure Layer (`infrastructure/`)

- **Strict Isolation:** Database engines (SQLite/`sqlite3`), external libraries (Surya OCR), and network communication (WebSockets) live here.
- **Data Mappers:** Always use a Mapper class (`infrastructure/database/mappers.py`) to map database rows (`sqlite3.Row`) into proper Domain Entities, and vice versa. Never bleed database details into upper layers.
- **Atomic Transactions:** Ensure database state changes are optimized and atomic to avoid N+1 query patterns.

### D. Presentation Layer (`api/`)

- **FastAPI Routers:** Routers must only handle HTTP/WS formatting, validation, status codes, and call the respective Use Case.
- **Dependency Injection (`api/dependencies.py`):** Centralize all concrete adapter instantiations (Singletons/Factories) here. Inject them into routers using FastAPI's `Depends`.

---

## 3. Code Generation Requirements & Quality Standards

- **Asynchronous First:** Write `async/await` compliant code wherever I/O or queues are involved (`asyncio.Queue`).
- **Error Handling:** Never swallow exceptions. Map technical/infrastructure infrastructure exceptions to domain exceptions or handle them cleanly at the API boundary using FastAPI exception handlers.
- **No Structural Shortcuts:** Do not combine files or violate the directory tree structure for "simplicity". If a new concept is introduced, create its respective entity, value object, interface, use case, and infrastructure implementation cleanly.
- **Comments & Docstrings:** Write concise, clear docstrings for public APIs and interfaces detailing the business intent, not just the technical steps.

## 4. Verification Check

Before outputting any code, mentally verify:

1. "Did I import an infrastructure or application component inside the domain?" -> If yes, abort and refactor.
2. "Is this business logic sitting inside a FastAPI router or an infrastructure adapter?" -> If yes, move it to a Domain Entity or an Application Use Case.
