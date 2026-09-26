# 06 · FAQ and the AI knowledge base

## What they asked for
- The same questions come in over and over. Put **FAQ in the top nav**; it's hard to find today.
- Build a **knowledge base** so people can ask questions and get AI answers. Danielle is writing the source document.
- After sending an inquiry, **prompt people with answers to common questions** ("any questions in the meantime?"). Today, people send bare-minimum inquiries and then follow up by email with questions the site already answers.

## Plan
- **Phase C (now):**
  - An FAQ page (`/venues/faq`) with an FAQ link in the nav. It starts from the four FAQs on the current TAP site plus booklet-based answers (all-in budgets, à la carte services).
  - A "While you wait" section on the confirmation page.
- **Later: an "Ask a question" box** that answers only from Danielle's document and says so when it doesn't know. It needs:
  - Danielle's doc;
  - a server route that holds the model API key (never in the browser);
  - Matt's decision on where that runs (this app, or Core).

## Needs
- **Danielle:** the knowledge-base document.
- **Matt:** where the AI endpoint lives, and the key and budget.
