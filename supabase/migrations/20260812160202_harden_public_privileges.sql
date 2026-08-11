-- Remove duplicate INSERT policies copied from the production schema dump.
drop policy if exists "users can insert own categories" on public.category;
drop policy if exists "users can insert own descriptions" on public.media_description;
drop policy if exists "users can insert own locations" on public.location;
drop policy if exists "users can insert own media" on public.media;

-- Keep only privileges used by the Data API. RLS remains the row-level guard.
revoke all on table
  public.category,
  public.favorites,
  public.location,
  public.media,
  public.media_description
from anon, authenticated;

grant select on table
  public.category,
  public.favorites,
  public.location,
  public.media,
  public.media_description
to anon;

grant select, insert, update, delete on table
  public.category,
  public.favorites,
  public.location,
  public.media,
  public.media_description
to authenticated;

revoke all on sequence
  public.category_category_id_seq,
  public.location_location_id_seq,
  public.media_media_id_seq
from anon, authenticated;

grant usage, select on sequence
  public.category_category_id_seq,
  public.location_location_id_seq,
  public.media_media_id_seq
to authenticated;

-- New public objects must receive explicit privileges in their migrations.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;