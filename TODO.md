# TODO

## Engine & OCR Processing

- [x] Enhance output and ocr generation
- [x] Filter noise and keep only content
- [x] Organize backend code with modulizing engine
- [ ] Implement dewarping algorithm in engine/preprocessor.py to straighten curved lines from physical book scans for accurate OCR.
- [ ] Integrate Surya OCR reading order detection in engine/ocr.py to ensure logical text flow (columns, footnotes) for read-aloud.
- [ ] Add post-processing in engine/core.py to repair hyphenation and ligatures from old prints for seamless audio playback.
- [ ] Auto-strip low-confidence OCR blocks marked as noise in backend/app/routers/ocr.py to reduce manual cleanup.

## Database & Storage

- [x] Store extracted text data in uploads folder as json
- [x] Process each pages and store in database
- [ ] Add "cleaned_text" column in restora.db to store post-processed text separately while preserving original OCR output.

## Frontend & UI

- [x] While processing pdf feedback to user with progress and what currently app trying to do
- [x] Manuel text correction before export
- [x] Code split in text editor and other big frontend components.
- [x] Add multiple page reader in ui with page controls
- [ ] Enchance detected text section
- [ ] Add more gestures to use detected text section.
- [ ] Create focus-mode editor in frontend to quickly clean OCR artifacts (page numbers, headers, noise) before read-aloud.
- [ ] Highlight words with OCR confidence below 80% in yellow within editor to prioritize critical corrections.
- [ ] Use WebSocket infrastructure for progressive text loading to enable immediate playback of processed pages without waiting.
- [ ] We should store and save the deleted lines and sections.
- [ ] Enable removing some sections from all pages. It should export with that

## Export & Read-Aloud Features

- [x] Export as searchable pdf
- [x] While showing text paragraphs should be together otherwise read aloud cuts between sentences. We can do this while exporting, maybe a button to make section locked and fixed.
- [ ] Add semantic HTML/Markdown export with proper heading structure for browser read-aloud and reader view compatibility.
- [x] Export whole pdf with all pages.

## Testing & Documentation

- [x] Document the code better
- [ ] Add unit tests and agent instructions
- [ ] Add rules and skills
