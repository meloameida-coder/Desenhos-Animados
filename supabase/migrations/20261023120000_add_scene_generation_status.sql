-- Add a dedicated generation status to each scene.
-- Apply only after reviewing this migration; this branch does not alter production automatically.
alter table public.scenes
  add column if not exists generation_status text not null default 'prepared'
  check (generation_status in ('prepared', 'generating', 'completed', 'error'));
