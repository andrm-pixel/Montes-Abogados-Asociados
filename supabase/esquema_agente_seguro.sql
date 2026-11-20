-- =============================================================
-- ESQUEMA DEL AGENTE DE IA (versión segura y repetible)
-- EJECUTAR DESPUÉS de montes_supabase.sql (usa public.is_staff()).
-- Diferencias con el esquema.sql original:
--   * Solo editor/admin autenticados leen o escriben conversaciones,
--     mensajes, aprendizaje y videos (antes: cualquiera con la clave anon).
--   * El público (anon) solo ve propuestas YA aprobadas.
--   * Incluye los GRANT que Supabase ya no da automáticamente.
--   * Se puede ejecutar varias veces sin error.
-- =============================================================

create table if not exists public.conversaciones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null default 'Nueva conversacion',
  pestana text not null default 'chat',
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

create table if not exists public.mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.conversaciones(id) on delete cascade,
  rol text not null check (rol in ('usuario','asistente')),
  texto text not null,
  creado_en timestamptz not null default now()
);
create index if not exists mensajes_conversacion_idx on public.mensajes (conversacion_id, creado_en);

create table if not exists public.propuestas (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid references public.conversaciones(id) on delete set null,
  tipo text not null default 'post',
  texto text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobada','rechazada')),
  destino text,
  url_publicacion text,
  creado_en timestamptz not null default now(),
  decidida_en timestamptz
);
create index if not exists propuestas_estado_idx on public.propuestas (estado, creado_en);

create table if not exists public.aprendizaje (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('idea','prompt')),
  texto text not null,
  util boolean not null default false,
  veces_usado int not null default 0,
  creado_en timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  propuesta_id uuid references public.propuestas(id) on delete set null,
  guion text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente','generando','listo','error')),
  url_video text,
  creado_en timestamptz not null default now()
);

alter table public.conversaciones enable row level security;
alter table public.mensajes       enable row level security;
alter table public.propuestas     enable row level security;
alter table public.aprendizaje    enable row level security;
alter table public.videos         enable row level security;

drop policy if exists "propuestas_publico_aprobadas" on public.propuestas;
create policy "propuestas_publico_aprobadas" on public.propuestas
  for select to anon, authenticated using (estado = 'aprobada');

drop policy if exists "propuestas_staff" on public.propuestas;
create policy "propuestas_staff" on public.propuestas
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "conversaciones_staff" on public.conversaciones;
create policy "conversaciones_staff" on public.conversaciones
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "mensajes_staff" on public.mensajes;
create policy "mensajes_staff" on public.mensajes
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "aprendizaje_staff" on public.aprendizaje;
create policy "aprendizaje_staff" on public.aprendizaje
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "videos_staff" on public.videos;
create policy "videos_staff" on public.videos
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Permisos explícitos (Supabase ya no los concede solo en proyectos nuevos)
grant select on public.propuestas to anon;
grant select, insert, update, delete on
  public.conversaciones, public.mensajes, public.propuestas,
  public.aprendizaje, public.videos
to authenticated;
