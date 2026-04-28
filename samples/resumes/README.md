# Sample Resumes for CV Parser Testing

5 markdown CVs covering different roles, layouts, and edge cases.
Convert them to PDF and feed into the Mini App's `/profile/upload` flow.

## How to convert MD → PDF

**Easiest (Chrome)**
1. Open the .md file in any markdown previewer (or render via VS Code preview).
2. Copy the rendered HTML output, paste into a Google Doc / Notion / similar.
3. File → Print → Save as PDF.

**One-shot CLI (pandoc)**
```bash
brew install pandoc
pandoc samples/resumes/01-senior-backend-engineer.md -o ~/Desktop/01-senior-be.pdf
```

**Online (drag-and-drop)**
- https://md-to-pdf.fly.dev/
- https://www.markdowntopdf.com/

## What each one stress-tests

| File | Stress-tests |
|---|---|
| 01-senior-backend-engineer | Long experience, broad stack, multiple languages |
| 02-senior-product-designer | Design vocabulary, soft skills, no traditional "stack" |
| 03-marketing-manager | Non-tech vocabulary, KPIs and metrics in copy |
| 04-junior-frontend-developer | Short experience, education-heavy, edge case for AI |
| 05-italian-marketing-comms | Italian language CV — checks i18n on the parser side |

## Expected output

After upload, the AI should fill:
- Identity (name, headline, location, email, phone, links)
- Years of experience
- English level
- 2–4 work experience entries with dates, role, stack
- 1–2 education entries
- 8–15 skills
- 2–4 languages with levels
