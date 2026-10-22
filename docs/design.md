# THINK UP · Visual design

The homepage retains the established Reflection.app-inspired palette and public navigation. Signed-in learning pages use the content-first direction agreed from Speak and Babbel references: a clear writing task, display/body type contrast, generous spacing and purposeful cards. THINK UP keeps its own learning content and role-specific workflows.

- Canvas: homepage and signed-in workspaces use warm off-white `#fcfbf8`, with a subtle lavender/sage wash; panels are white.
- Text: `#302e38`; secondary text: `#716a7b`; accent: muted violet `#7361bc`; accent surface: `#f0ebf8`. Sage and sand are used on supporting surfaces.
- Type: self-hosted variable Manrope (weights 200–800), including all Vietnamese glyphs, with system fallbacks. Intermediate weights 500/550/600/650 use real font variation rather than falling back to the former static Regular/Bold files. Workspace display headings use Georgia with serif fallbacks. Font files and the SIL Open Font License are in `public/fonts`. No runtime font requests to Google.
- Shared theme: `app/reflection-theme.css` defines the homepage palette. `app/workspace-theme.css` applies the signed-in palette after the page layout styles. `app/workspace-navigation.css` shares the cream and purple desktop frame across student, lecturer and admin; responsive staff navigation and materials live in `staff-experience.css`, with teaching-specific details in `lecturer-experience.css` and student bottom navigation in `student-navigation.css`. `WorkspaceHeader.tsx` is shared by learning, teaching, administration, messages and profiles.
- Welcome: centered headline and primary action, interactive four-section writing illustration clearly marked as a preview, three practical learning steps, role-specific entry links, native FAQ disclosures and a clear closing invitation.
- Language: one compact globe trigger opens a menu with the full names Tiếng Việt and English and a checked selection. Arrow keys, Home/End, Escape, outside click and Tab are supported. The language cookie and in-progress form values are preserved. Language, navigation and account menus close each other.
- Auth: one centered form on the same warm paper and muted violet palette as the workspaces. A full-width brand/language header, readable 16px inputs and a small footer frame the form. Login/register omit marketing panels and repeated welcome copy; activation retains its necessary account context. `app/auth-experience.css` owns this presentation at desktop and mobile sizes.
- Public menu: transparent at the top, frosted on scroll. A real mobile disclosure menu has readable links, keyboard focus and Escape to close.
- Footer: working product/account links, a short description and back-to-top action. Workspaces use a compact footer with a guide button and introduction link.
- Workspace: student, lecturer and admin use the same cream frame, compact sticky header and left sidebar. Help, language and account controls sit together in the header. Admin keeps seven destinations with concise labels and the current page highlighted; course filtering on submissions, progress and similarity uses the shared sidebar course picker. Messages and profiles keep the same role frame. Admin home links return to `/admin/courses`. Lecturer keeps six sidebar destinations, a shared course picker and an inline class filter; its home link returns to `/lecturer/submissions`. Form guards, role scope and unread counts are preserved.
- Student editor: free writing with optional structure guidance, course-specific weekly guidance, evidence and tools, a three-tab thinking/Coach/Feedback assistant, and whole-reflection review before submission. Smaller screens place writing before the assistant.
- Student overview: one current-week prompt and writing action with real journey completion, then a shared surface for recent reflections and commitments. Supporting totals remain available in collapsed summaries.
- Lecturer review: writing and grading remain separate; AI/history are collapsible. Course settings show one week or criterion at a time.
- Motion: once-only public section reveals, short local workspace transitions, hover feedback, preview-tab transitions and native accordion behavior. Content is visible without JavaScript. Reduced-motion preferences disable the added effects.
- Responsive layouts: product illustration and page columns stack on small screens. Student uses five bottom navigation items at 1000px and below; lecturer and admin use a header menu button and a scrollable left drawer at the same breakpoint. Escape/outside-click closing supports keyboard and pointer use. Labels, preview content and FAQs are bilingual; authored reflections are preserved.

Validation: TypeScript, production build, targeted lint, domain/i18n tests, server-rendered pages and demo account/permission workflows. Browser interaction and screenshot QA cover role navigation, responsive menus, language controls, profiles and the homepage link. The homepage layout and colors remain unchanged by the workspace refresh. The shared Manrope font asset is updated across public and signed-in pages.

## Consistency pass · 17 October 2026

The shared workspace styles also cover nested feedback, evidence, history, course/rubric forms, user filters and dialogs. Old blue-grey surfaces now use the cream/lavender tokens. Report totals use a quiet summary strip, and comparison sections inside the editor assistant no longer create nested white cards. Modal save actions stay within the visible scroll area. Rubric configuration labels use the current /10 ranges, preserving historical assessments on their original scales.

Font coverage was checked against the entire Vietnamese extended range U+1EA0–U+1EF9 and actual browser-rendered fonts. Browser QA covered 22 routes across all three roles, VN/EN and five viewport widths (220 page states), plus expanded writing support, reports, forms and dialogs. All 60 existing tests, typecheck, lint and production build passed. QA uses read-only demo sessions; reflection, course, user and messaging data are not changed.

## Student layout pass · 20 October 2026

The overview reads directly on the cream canvas: the current weekly task leads, recent writing follows as a reading list, and commitments occupy one sage note area with a quiet AI Coach link. A new personal reflection remains directly accessible below the recent list.

Journey uses quiet week navigation beside one continuous weekly page, with a lavender chapter introduction. Writing, commitments and process remain available as open sections separated by rules. Summary metrics are collapsed by default; opening them preserves all action filters and keyboard focus behavior.

Progress prioritizes the actual Kember chart on the shared canvas and the latest lecturer comment in a sage note. Criterion guidance expands on request (open by default when there is no lecturer comment), course/recent work follow as full-width sections, and the criterion tab uses four sequential rows. Aggregate totals remain in a separate collapsed summary. No scores, reflections or commitments are invented or removed.

Reference inspection: the public [Speak homepage](https://www.speak.com/) and [Babbel mobile page](https://www.babbel.com/mobile?locale=en) were reviewed for their lead task, display type, open sections and restrained language navigation. THINK UP keeps its existing cream/violet/sage palette and its own learning content.

The globe menu was checked on 100 route/viewport combinations across three roles and public Home/login/register pages. Checks include keyboard navigation, menu coordination, cookie selection and auth form input preservation. Separate checks preserve an authored draft across VN/EN using in-memory autosave and retain dirty-course/configuration guards.

`app/student-learning.css` scopes the layout to these three student views; the editor, account pages, lecturer/admin pages and homepage keep their existing layouts and palette.

## Student top bar and sidebar · 20 October 2026

The Student workspace uses a white canvas, a 64px sticky top bar with ThinkUp, language and account controls, and a compact 224px fixed left sidebar with icons and visible labels for the five student destinations. The sidebar floats 14px below the header and above the viewport bottom, inset 12px from the left, with an 18px radius, a thin border and a soft two-layer shadow. Its existing 224px content gutter is preserved. Desktop links lift by 1px on hover when reduced motion is not requested. The five English navigation labels are Overview, Practice, Journey, Progress and Messages (Vietnamese: Tổng quan, Thực hành, Hành trình, Tiến bộ, Tin nhắn). Existing destination keys, routes and page content stay unchanged. Labels appear beside each icon and also have hover titles; the selected destination has a soft lavender background. This applies to overview, writing, journey, progress, messages and profile so route changes preserve the frame. The reference image informs only the frame: existing page content, data and actions are preserved. Homepage and other-role colors remain unchanged.

At widths of 1000px and below, the same links open as a left drawer from the menu button. Escape, backdrop click, outside focus, selecting a destination and opening account/language controls close it. The drawer locks background scrolling while open; resizing to desktop releases that lock. Native links and existing save/leave guards are preserved.

Browser verification covered 96 student route/language/viewport combinations, 24 lecturer/admin regression pages, breakpoint resizing, a short mobile viewport, reduced motion and draft preservation with in-memory autosave. Existing tests, typecheck, lint and production build passed.

Content starts beside the compact sidebar. The header remains 64px high and white; adding labels changes only the navigation layout. The visible-label update was verified on 60 Student route/language/viewport combinations, including 320px mobile screens and the editor canvas; production build passed. Page-specific responsive rules still apply on smaller screens. `app/student-navigation.css` owns this student-only frame.

## Social preview

Asset: `public/og-v2.png`, generated with the built-in ImageGen tool. The original `public/og.png` is preserved. Page metadata continues to reference this existing brand asset; it predates the current workspace refresh.

Final generation prompt:

> Use case: ads-marketing. Create one finished landscape social preview card for THINK UP, an elegant modern reflective learning website. Wide 1.91:1 composition, approximately 1200x630. Palette: warm ivory #fbfcf8, forest green #355b4b, charcoal #26332d, pale sage #edf2eb. Sophisticated editorial typography: large elegant serif headline paired with restrained modern sans-serif logo and small labels. Main visual motif on the right: a beautifully typeset off-white reflection journal card, four fine ruled rows with exact labels WHAT?, SO WHAT?, NOW WHAT?, ACTION. Subtle layered paper edges, tiny typographic numbering 01 02 03 04; light natural paper depth, ample negative space. Left brand exact lowercase text 'thinkup' with tiny upward arrow. Under brand prominent exact Vietnamese headline, across two lines: 'Viết tốt hơn.' and 'Nghĩ sâu hơn.' Small exact footer text 'REFLECT · LEARN · ACT'. Include no other copy. Looks like a premium calm education/design publication, crisp typography and balanced white space. No purple, no spheres, no gradients, no people, no stock imagery, no logos besides thinkup, no watermark. All Vietnamese diacritics exact and highly legible.


## Student journal redesign · 20 October 2026 (current)

This revision supersedes the student layout and frame descriptions above. The student role now uses a warm paper canvas (`#fcfaf7`), plum ink (`#39323f`), muted violet (`#79618d`) and sage notes. The left navigation is continuous with the page rather than a floating panel. At 1000px and below it becomes a persistent five-item bottom navigation with visible labels and safe-area spacing. The brand links back to `/student`. Navigation labels are My space / My writing / Journey / Progress / Messages, with matching Vietnamese labels.

The home screen recommends a concrete next step: returned work first, then an editable draft, then the current submitted work as a read-only action. A paper illustration is drawn with CSS. Real completed weeks form a slim nine-week trail; recent writing is ordered by update time and active commitments by due date. No records or scores are generated for presentation.

The writing library uses a continuous reading list. The editor places a spacious paper writing surface beside the three existing AI support panels, with settings, evidence, tools, autosave and submission behavior retained. Journey weeks form a horizontal trail above the weekly content, avoiding a second left sidebar; all four arrow keys support week selection. Progress prioritizes the assessed Kember chart and lecturer feedback. Student messages and profile inherit the same materials. Changes are scoped to `.student-workspace`; other roles retain their frame.

Source ownership: `StudentOverview.tsx` and `student-overview.css` own the home; `student-navigation.css` owns the student frame; `student-experience.css` supplies the common student materials and page integration. The existing learning/editor styles provide the underlying component layouts.

Validation for this revision: typecheck, production build, the existing 60 unit/render tests and two new home behavior/render tests passed. Authenticated HTTP checks cover all six student destinations in both languages using the existing local demo account. The older `test:demo` fixture-count assertion expects six reflections but the current local workspace has nine; this revision preserves those records. Browser screenshots and interactive viewport QA could not be performed because macOS Computer Use permissions were unavailable. Earlier browser QA statements in this document describe earlier revisions.


## Student readability and copy · 21 October 2026

Student body text is now generally 15–16px, supporting labels 13–14px, and desktop navigation 14px. The bottom navigation uses 12px labels to keep all five destinations visible. Legacy tiny labels in writing, journey and progress components are raised to at least 13px. Editor controls use 16px text, with additional spacing for the larger labels.

Repeated motivational lines, decorative section kickers, sidebar slogans and repeated AI instructions have been removed. Empty states are short. Weekly prompts, rubric explanations, submission visibility, evidence consent, file limits, minimum word counts and actual status/error messages remain available. Journey navigation shows readable week numbers, with the full topic in the selected week's heading and accessible navigation text.

`CoursePicker.tsx` presents the current course name and code with a book icon in a larger control. An overlaid native select preserves keyboard navigation, platform touch pickers, accessible naming and the existing controlled course filter. On mobile it occupies the context row. Typecheck, all 62 existing tests and production build passed. No new browser/viewport QA was performed in this revision; the previous macOS Computer Use permission limitation remains.


## Hydration date correction · 21 October 2026

Student home date labels now reuse the deterministic numeric-parts formatter in `lib/message-date.ts`. Server ICU formatted September as “Sept” while the browser used “Sep”, causing a text hydration failure. The regression test simulates both ICU variants and compares the complete student-home markup in VN/EN across UTC, Vietnam, Los Angeles and Auckland timezones. Message/profile routes also provide their localized page titles on the server, matching their client title updates during streaming metadata hydration.


## Next-action guidance · 22 October 2026

Student feedback identified the main usability problem as not knowing what to do next. The home feature now states a concrete next action and opens its real target: lecturer feedback for returned work, an existing draft, an outstanding commitment, a commitment form after the current week's submission, the waiting submission or the completed journey. Future submissions do not hide the current unwritten week. This is derived from actual records by `studentNextStep`; it does not require AI or fabricate unread feedback.

The editor has a compact visible next-action bar for writing, reading lecturer feedback, selecting a course, reviewing, confirming submission and following through on an action. Lecturer feedback precedes the AI rubric tools. The final submit action still requires the explicit review step. AI remains optional. With a single enrolled course, new reflections start with that course selected; personal writing remains available in the editor's course selector. The global course filter is hidden while editing, leaving the article's own course controls as the source of context.

Each journey week uses the same recommendation rules and a specific button instead of a generic “View reflection” action. Returning from a completed reflection to its commitments opens its course and week. Existing autosave, evidence consent, submission locking and action confirmation remain intact. Tests cover state transitions, the visible editor action and the September hydration regression; authenticated HTTP checks verify the home and journey against existing local data. Interactive browser validation remains limited by the previously unavailable Computer Use permissions.


## Compact student layout and palette · 22 October 2026 (current)

User preference: student screens should use neutral paper/white surfaces and the existing violet accent, with no green decorative areas. Sage commitment/progress panels, green completion markers and the green paper leaf are removed. Success, completion and revision-addition states in the student role now use violet as well.

The home recommendation is a compact row with one task title, the actual reflection/commitment context and one primary action. The large journal illustration and repeated explanatory sentences are removed. Recent reflections and commitments share one aligned surface; rows keep their title, week/date and status, with fewer repeated counts and shorter previews. Full authored content remains available when opening the item.

The editor's next-action bar retains its working state-dependent button with one short label. Journey footers retain the next-action button and deadline. Progress explanations and strength details open on demand; duplicate counts and instructions are removed. The content area is narrower and section headings/spacing are more compact while keeping the previously requested readable body sizes. Existing next-step logic, submission confirmation, autosave and deterministic date formatting are retained. All 66 tests, typecheck and production build passed; browser viewport QA remains subject to the previously unavailable macOS Computer Use permissions.


## Student navigation cleanup · 22 October 2026 (current)

The course filter now sits above the left navigation, in a compact native-select control. At 1000px and below it becomes a compact row within the existing bottom navigation, with additional content clearance. It remains hidden during active writing so the reflection's own course control supplies the editing context.

Student help now sits beside language and account controls in the top header, including messages and profile. The breadcrumb/context row and home greeting are removed. Home begins with its actionable task heading; New reflection sits beside Recent reflections, with View all below the list. Other roles retain their existing context row.

Typecheck, all 66 tests and production build passed. Authenticated HTTP/HTML checks verified all six student destinations in both languages, including sidebar course placement, header help and removal of the breadcrumb/greeting. Browser viewport QA remains limited by the previously unavailable macOS Computer Use permissions.


## Course menu refinement · 22 October 2026 (current)

The sidebar trigger now shows only a book icon, Course and a chevron. The previous native select is replaced by a styled menu with full course names/codes, a violet selected row and checkmark, hover/focus states and a short fade/scale transition. Reduced-motion preferences disable transitions.

The HTML popover layer lets the menu extend beyond the scrolling sidebar. Its measured position stays within the viewport and opens upward above the bottom navigation when needed. Native light dismissal, Escape, focus restoration, arrow/Home/End navigation and disabled states preserve keyboard use. The existing course filter callback and all-courses value are retained; rendering never changes the filter.

Typecheck, component ESLint, all 67 unit/render tests and production build passed; the student suite was rerun after the accessibility adjustment. The new render regression covers the current selection, all-courses fallback, empty enrollments, disabled control and both languages. Interactive browser/viewport validation remains subject to the previously documented Computer Use limitation.


## Messages layout cleanup · 22 October 2026 (current)

The directory and conversation now sit directly on the page with one vertical divider, replacing separate bordered cards. Tabs use an underline, search has a visible field and search icon, and four compact role buttons replace the platform select. Names, previews, roles, timestamps and message text use readable sizes and the existing violet/neutral palette.

The welcome view contains one short heading and a link to People. The Connect in THINK UP badge and long introductory copy are removed. Its malformed square came from `.empty > span`, which applied the generic 49px icon container to the introductory text; the welcome view now has its own styles. The active thread and composer follow the same alignment, with a single-column list/thread switch on mobile. Existing history, drafts, send/retry, read markers and polling logic are retained.

`messages.css` owns the shared messaging presentation. Typecheck, targeted ESLint, all 68 tests and production build passed. Authenticated HTTP/HTML checks cover empty and open-thread states in VN/EN, including accessible search/role filters and the enabled composer. The local server was restarted to clear a stale missing-stylesheet import and both states then returned HTTP 200. Interactive browser/viewport validation remains limited by the previously documented Computer Use permissions.

The composer has since been reduced to a single rounded input bar with 16px text and a 40px icon-only send control on the right. The keyboard instruction and character counter are removed. The input grows from one row up to 144px, then scrolls, and shrinks after sending. Enter/Shift+Enter, IME composition, the 4,000-character limit, draft preservation and inactive-recipient locking remain in place. The send control keeps its translated accessible label and shows a spinner during sending. This refinement passed typecheck, targeted ESLint, four messaging/render tests, four additional read-only composer render checks and production build.


## Commitment dialog refinement · 22 October 2026 (current)

The commitment dialog uses a wider 720px surface with a compact header, scrolling form body and persistent Cancel/Save footer. Shorter text areas, a criteria/deadline row and four visible status choices replace the tall form and platform status select. Fields use 16px text; labels and choices use 14px. Status inputs retain native radio keyboard behavior with violet selection/focus styling.

Evidence, source attachments, result-file upload and follow-up writing are grouped in an optional disclosure. Follow-up writing uses styled radio rows filtered to other reflections in the source course. The file chooser has a custom Add file control. New commitments show the outcome field when needed; completed commitments still require an outcome. Existing values, upload types/limits, revision checks and explicit saves are retained. Modal focus wrapping now excludes hidden controls and includes disclosure summaries; history dates use the deterministic timestamp formatter.

Typecheck, targeted ESLint, all 69 tests and production build passed. The added render regression covers four statuses, VN/EN, busy state, completion validation, course-scoped follow-up choices and unchanged input data. Additional render checks cover history across timezones. The local page and new stylesheet return HTTP 200. Interactive browser/viewport validation remains limited by the previously documented Computer Use permissions.


## Lecturer frame and quieter workspace pages · 22 October 2026

Lecturer now shares the cream/violet sidebar and compact header with student and admin. Its six destinations use short labels; course selection uses the shared popover in the sidebar, scoped to teaching assignments and the selected class. Class filtering opens as an inline list of choices. The header groups help, language and account controls. Messages and profiles retain this role frame, and the brand returns to `/lecturer/submissions`. Staff navigation opens as a left drawer at 1000px and below. Existing course, grading, draft, export and permission behavior remains in place.

Teaching pages use larger body text and controls, status tabs on the page canvas, and a paper reading surface with fewer nested supporting cards. A shared staff stylesheet preserves the preceding admin design.

Generic page titles are kept for screen readers and removed from the visible page introduction. Messages in all three roles starts with the new-message action and conversation area, without the Messages heading or introductory paragraph. The same treatment removes repeated introductions from student writing, journey and progress, staff lists/settings and all profile pages. Actual reflection titles, course names, section headings that identify data, field labels, statuses and actions remain visible.

Validation: 73 unit/render tests, TypeScript, targeted ESLint and production build pass. Authenticated HTTP checks cover all seven lecturer destinations in English and Vietnamese, selected course/class and grading pages, Messages/profile across all three roles in both languages, and the other changed student/admin pages. Checks are read-only apart from creating and closing temporary demo sessions. No grades, configurations, messages or authored content were changed. Visual browser interaction QA remains unavailable because Computer Use permissions are not granted.


## Authentication pages · 22 October 2026

Login, registration and activation now share the workspace palette (`#fcfaf7`, `#39323f`, `#79618d`), serif display heading, compact header and 9px controls. A single form on the open canvas replaces the split lavender card, promotional text and decorative journal. Form labels are 14px, inputs 16px and primary actions 15px. Password visibility uses an accessible eye button, password-manager names/autocomplete remain explicit, and registration keeps a concise password limit and student-access note. The signed-in, verification, error and busy states remain available. Older auth layout rules were removed from the shared stylesheets.

The existing authentication payloads, validation rules and role redirects are preserved. TypeScript, targeted ESLint, all 73 existing tests and the production build pass. Read-only HTTP checks cover login/register/setup and the homepage in English and Vietnamese, including field names, autocomplete, password limits and route links. Computer Use was attempted again and returned “Computer Use permissions are not granted”; visual browser verification remains unavailable.
