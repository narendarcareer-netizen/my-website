-- Phase 9 corrective migration: make source/external identity usable by PostgREST upserts
-- and associate legacy Phase 3 jobs with their configured career source.
drop index if exists public.jobs_source_external_unique;
create unique index if not exists jobs_source_external_unique on public.jobs(source_id,external_id);

update public.jobs as job
set source_id = source.id
from public.career_sources as source
where job.source_id is null
  and job.company_id = source.company_id
  and upper(job.ats_type) = source.ats_type
  and source.active = true;

notify pgrst,'reload schema';
