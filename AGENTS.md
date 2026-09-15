# Math Inquiry Lab — working agreement

## Purpose
A practical, minimalist Traditional Chinese mathematics inquiry site for Kenneth
Cheng (程淑鍵), NOT a portfolio landing page, SaaS product or AI tutor.
The current artifact is a runnable classroom prototype, not validated pedagogy.

## Read first
- README.md (commands and current status)
- docs/DESIGN.md (visual and interaction constraints)
- docs/DEPLOY.md (separate project repository; publishing procedure)
- docs/TEST_REPORT.md (what has and has not actually been tested)
Read the public `site/teacher-guide.html` before changing mathematical tasks.

## Protect the user's existing work
- Target a NEW repository `skcKenneth/math-inquiry-lab` unless explicitly changed.
- Do not edit, replace or push to `skcKenneth/skcKenneth.github.io`.
- Do not clone or migrate the whole personal blog. It remains independent.
- Never force-push, delete a repository, overwrite unrelated files or add CNAME.
- If target already exists, inspect its content; stop before destructive changes.
- Publish only `site/` to Pages, never the entire working folder as an artifact.
- No student records, personal emails, credentials, private documents or photos.

## Implementation boundaries
- HTML + CSS + native JavaScript ES modules + SVG. No build step is required.
- No runtime frameworks, CDN dependencies, remote fonts, analytics, login,
  database, API keys, leaderboards, generated decorative images or AI grading.
- Use system fonts; never copy font files into this repo.
- Keep production assets under 500 KB unless a specific need is justified.
- Minimalism: off-white / dark ink / one muted green accent / thin rules / no shadows.
- Native HTML forms, keyboard alternatives to dragging, numeric alternatives to sliders.
- Student notes are opt-in for local storage; no defaults that silently persist work.
- Namespace and clear only this app's lab key, never `localStorage.clear()`.
- Share numeric state/seed only, never free-text notes in the URL.
- Do not turn text inputs or restored data into unescaped innerHTML.

## Mathematics and teaching
- Preserve a=0 degeneracy; distinguish zero, one, two or infinitely many roots.
- Probability uses reproducible pseudorandomness; no forced convergence or
  gambler's fallacy, and finite simulation is not a proof.
- Regression: separate residual, leverage and influence. R² is not causation.
- Do not claim trial results, teaching gains, accessibility certification or
  school endorsement without actual evidence.
- Keep teacher notes public and describe them as public, not access-controlled.

## Verification gates
- `npm run verify` (Node 22+, no npm installation needed).
- `python -m pip install -r requirements-dev.txt`
- `python -m playwright install chromium`
- `python tests/browser_smoke.py`
- Review 390 / 768 / 1440 px, projection mode, keyboard controls and print styling.
- `tests/in_memory_ui.py` is a restricted-environment diagnostic only. It uses
  mocks and MUST NOT replace real browser navigation/storage/download tests.
- Do not relax tests to produce a green result. Independently derive expected math.
- The Pages workflow gates deployment on real HTTP/browser tests.

## Completion report
Report changed files, commands actually run, their outcomes, untested items,
GitHub repository, Pages workflow result and a live URL only after verifying it.
A local screenshot is not proof that GitHub Pages has deployed successfully.
