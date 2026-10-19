# Trainer ID frame retirement - CODEX-8

Owner explicitly scrapped Trainer ID frames and requested removal from Gifts and the entire site. This authorizes the scoped catalog retirement and frontend removal.

Removed gift category, Progression category (including stale returned frame entries), fixture entries, trainer card frame class/variable, obsolete frame CSS variants and unlock display label. Existing legacy-frame notice suppression remains intentionally, so old records cannot surface the scrapped feature. Historical migrations, ownership/audit records and compatibility columns are preserved; they do not enable the feature.

Applied Supabase migration `retire_trainer_id_frames`: disables enabled/starter flags on all kind=frame catalog entries. Source: supabase/retire-trainer-id-frames.sql. This is already applied; GitHub does not apply it. Preflight found only frame-plain still enabled; four other frames were already disabled. Existing unlock_cosmetic and admin_grant_cosmetic reject disabled entries. No achievement currently rewards a frame. Post-apply: zero enabled frames, zero starter frames, zero frame achievement rewards. No trainer ownership/profile/reward mutations or destructive deletion.

Validation: 72 non-writing suites/build pass (APP rc133, 395 stamps). Retired-frame regression covers stale catalog/ownership data; historical CSS assertion corrected. REAL DOM sanitized fixture confirms nine gift categories without frames. Runtime search finds no Trainer ID frame labels or id-card-frame CSS/classes. Protected-account/gameplay/D86/activation/stamp/spending restrictions preserved. Owner records supersede prior CODEX reports describing frame support. Introducing commit/Pages run record publication; hard refresh existing tabs.
