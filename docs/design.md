# THINK UP · Visual design

The homepage retains the established Reflection.app-inspired palette and public navigation. Signed-in learning pages use the content-first direction agreed from Speak and Babbel references: a clear writing task, display/body type contrast, generous spacing and purposeful cards. THINK UP keeps its own learning content and role-specific workflows.

- Canvas: homepage and signed-in workspaces use warm off-white `#fcfbf8`, with a subtle lavender/sage wash; panels are white.
- Text: `#302e38`; secondary text: `#716a7b`; accent: muted violet `#7361bc`; accent surface: `#f0ebf8`. Sage and sand are used on supporting surfaces.
- Type: self-hosted variable Manrope (weights 200–800), including all Vietnamese glyphs, with system fallbacks. Intermediate weights 500/550/600/650 use real font variation rather than falling back to the former static Regular/Bold files. Workspace display headings use Georgia with serif fallbacks. Font files and the SIL Open Font License are in `public/fonts`. No runtime font requests to Google.
- Shared theme: `app/reflection-theme.css` defines the homepage palette. `app/workspace-theme.css` applies that palette and the horizontal header to signed-in pages, after the page layout styles. `WorkspaceHeader.tsx` is shared by learning, teaching, administration, messages and profiles.
- Welcome: centered headline and primary action, interactive four-section writing illustration clearly marked as a preview, three practical learning steps, role-specific entry links, native FAQ disclosures and a clear closing invitation.
- Language: shared EN/VN buttons with an explicit selected state and keyboard access; preserves the language cookie and any in-progress form values.
- Auth: one white card with a quiet journaling introduction on the left and the form on the right. A minimal brand/language header and small footer keep focus on signing in. Mobile hides the introduction and shows the form first.
- Public menu: transparent at the top, frosted on scroll. A real mobile disclosure menu has readable links, keyboard focus and Escape to close.
- Footer: working product/account links, a short description and back-to-top action. Workspaces use a compact footer with a guide button and introduction link.
- Workspace: a full-width sticky cream header using the homepage colors, with the brand/home link, role-specific links, EN/VN controls, an avatar dropdown containing Profile and Log out. Breadcrumbs and course/class filters sit in a separate, lightweight context row. Lecturer and admin keep their six and seven navigation destinations; students keep their five destinations. Form guards, role scope and unread counts are preserved.
- Student editor: free writing with optional structure guidance, course-specific weekly guidance, evidence and tools, a three-tab thinking/Coach/Feedback assistant, and whole-reflection review before submission. Smaller screens place writing before the assistant.
- Student overview: current-week prompt and writing action, a paper-style prompt illustration with real journey completion, recent reflections and commitments. Small supporting totals use existing data; progress and journey metrics follow the main content.
- Lecturer review: writing and grading remain separate; AI/history are collapsible. Course settings show one week or criterion at a time.
- Motion: once-only public section reveals, short local workspace transitions, hover feedback, preview-tab transitions and native accordion behavior. Content is visible without JavaScript. Reduced-motion preferences disable the added effects.
- Responsive layouts: product illustration and page columns stack on small screens; workspace navigation opens in a compact menu at 1280px and below, with Escape/outside-click closing and a scrollable menu on short viewports. All new labels, preview content and FAQs are bilingual; authored reflections are preserved.

Validation: TypeScript, production build, targeted lint, domain/i18n tests, server-rendered pages and demo account/permission workflows. Browser interaction and screenshot QA cover role navigation, responsive menus, language controls, profiles and the homepage link. The homepage layout and colors remain unchanged by the workspace refresh. The shared Manrope font asset is updated across public and signed-in pages.

## Consistency pass · 17 October 2026

The shared workspace styles also cover nested feedback, evidence, history, course/rubric forms, user filters and dialogs. Old blue-grey surfaces now use the cream/lavender tokens. Report totals use a quiet summary strip, and comparison sections inside the editor assistant no longer create nested white cards. Modal save actions stay within the visible scroll area. Rubric configuration labels use the current /10 ranges, preserving historical assessments on their original scales.

Font coverage was checked against the entire Vietnamese extended range U+1EA0–U+1EF9 and actual browser-rendered fonts. Browser QA covered 22 routes across all three roles, VN/EN and five viewport widths (220 page states), plus expanded writing support, reports, forms and dialogs. All 60 existing tests, typecheck, lint and production build passed. QA uses read-only demo sessions; reflection, course, user and messaging data are not changed.

## Social preview

Asset: `public/og-v2.png`, generated with the built-in ImageGen tool. The original `public/og.png` is preserved. Page metadata continues to reference this existing brand asset; it predates the current workspace refresh.

Final generation prompt:

> Use case: ads-marketing. Create one finished landscape social preview card for THINK UP, an elegant modern reflective learning website. Wide 1.91:1 composition, approximately 1200x630. Palette: warm ivory #fbfcf8, forest green #355b4b, charcoal #26332d, pale sage #edf2eb. Sophisticated editorial typography: large elegant serif headline paired with restrained modern sans-serif logo and small labels. Main visual motif on the right: a beautifully typeset off-white reflection journal card, four fine ruled rows with exact labels WHAT?, SO WHAT?, NOW WHAT?, ACTION. Subtle layered paper edges, tiny typographic numbering 01 02 03 04; light natural paper depth, ample negative space. Left brand exact lowercase text 'thinkup' with tiny upward arrow. Under brand prominent exact Vietnamese headline, across two lines: 'Viết tốt hơn.' and 'Nghĩ sâu hơn.' Small exact footer text 'REFLECT · LEARN · ACT'. Include no other copy. Looks like a premium calm education/design publication, crisp typography and balanced white space. No purple, no spheres, no gradients, no people, no stock imagery, no logos besides thinkup, no watermark. All Vietnamese diacritics exact and highly legible.
