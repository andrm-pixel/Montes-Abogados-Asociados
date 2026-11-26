-- ============================================================================
--  MONTES ABOGADOS ASOCIADOS — BASE DE DATOS PARA SUPABASE (VERSIÓN CORREGIDA)
--  ---------------------------------------------------------------------------
--  Reemplaza la persistencia actual del sitio (localStorage + datos.json):
--
--    localStorage "datosMontesSitio"   -> firm_settings, social_links,
--                                         practice_areas, team_members,
--                                         publications, carousel_slides
--    localStorage "cuentasMontes"      -> auth.users + profiles
--    localStorage "sesionMontes"       -> sesión de Supabase Auth
--    localStorage "solicitudesMontes"  -> contact_requests
--    localStorage "pruebasAutorizacionMontes" -> consent_records
--
--  Cómo usarlo: Supabase -> SQL Editor -> pegar todo -> Run.
--  Es idempotente: se puede volver a ejecutar sin duplicar datos.
-- ============================================================================

-- ============================================================================
--  0. EXTENSIONES
-- ============================================================================

-- Permite crear is_staff()/is_admin() antes de la tabla profiles.
set check_function_bodies = off;

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;    -- búsquedas "contiene" rápidas

-- ============================================================================
--  1. TIPOS
-- ============================================================================

do $$ begin
  create type public.rol_usuario as enum ('cliente', 'editor', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.bloque_area as enum ('preventiva', 'litigio');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estado_publicacion as enum ('borrador', 'publicado', 'archivado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tipo_solicitud as enum ('contacto', 'cuenta');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estado_solicitud as enum ('recibida', 'en_revision', 'respondida', 'cerrada', 'spam');
exception when duplicate_object then null; end $$;

-- ============================================================================
--  2. FUNCIONES DE APOYO
-- ============================================================================

-- Convierte un texto en slug: "Derecho Comercial" -> "derecho-comercial".
-- translate() quita tildes y la eñe; así no dependemos de la extensión unaccent.
create or replace function public.slugify(p_texto text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(p_texto, ''),
      'áéíóúüÁÉÍÓÚÜñÑ',
      'aeiouuAEIOUUnN')),
    '[^a-z0-9]+', '-', 'g'));
$$;

-- Mantiene actualizado_en al día en cada UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

-- ¿El usuario conectado es editor o administrador?
-- SECURITY DEFINER evita recursión con las políticas de profiles.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.activo
      and p.rol in ('editor', 'admin')
  );
$$;

-- ¿El usuario conectado es administrador?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.activo
      and p.rol = 'admin'
  );
$$;

-- ============================================================================
--  3. TABLAS
-- ============================================================================

-- ----------------------------------------------------------------------------
--  3.1 PERFILES
--  Un perfil por cada usuario de auth.users. Los clientes del sitio entran
--  aquí con rol 'cliente'; el personal de la firma, con 'editor' o 'admin'.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  usuario         text,
  nombre          text not null default '',
  apellido        text,
  correo          text,
  telefono        text,
  iniciales       varchar(3),
  rol             public.rol_usuario not null default 'cliente',
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  constraint profiles_usuario_largo check (usuario is null or char_length(usuario) >= 3),
  constraint profiles_correo_formato check (correo is null or correo ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  constraint profiles_telefono_largo check (telefono is null or char_length(telefono) between 7 and 25),
  constraint profiles_iniciales_largo check (iniciales is null or char_length(iniciales) between 1 and 3)
);

-- ----------------------------------------------------------------------------
--  3.2 DATOS DE LA FIRMA (fila única)
--  Equivale a datos.empresa + datos.contacto de datos.json.
-- ----------------------------------------------------------------------------
create table if not exists public.firm_settings (
  id                  smallint primary key default 1 check (id = 1),
  nombre              text not null,
  grupo               text,
  titulo_pagina       text,
  descripcion         text,
  cobertura           text,
  nit                 text,
  color_marca         text not null default '#006cb7'
                        check (color_marca ~* '^#[0-9a-f]{6}$'),
  logo_url            text,
  telefono            text,
  telefono_enlace     text,
  telefono_alterno    text,
  whatsapp_numero     text,
  whatsapp_mensaje    text,
  correo_principal    text,
  correo_datos        text,
  correo_alterno      text,
  direccion_bogota    text,
  ciudad_bogota       text,
  direccion_corta     text,
  mapa_url            text,
  direccion_madrid    text,
  ciudad_madrid       text,
  sitio_web           text,
  sitio_web_espana    text,
  horario             text,
  horario_sabado      text,
  horario_pie         text,
  formulario_destino  text,
  actualizado_en      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  3.3 REDES SOCIALES
-- ----------------------------------------------------------------------------
create table if not exists public.social_links (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  icono       text not null,
  url         text not null default '',
  orden       smallint not null default 0,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  3.4 ÁREAS DE PRÁCTICA (las 7 áreas del sitio)
-- ----------------------------------------------------------------------------
create table if not exists public.practice_areas (
  id              uuid primary key default gen_random_uuid(),
  numero          text not null default '',
  slug            text not null unique,
  titulo          text not null,
  corto           text,
  bloque          public.bloque_area not null default 'preventiva',
  texto           text not null default '',
  icono           text,
  pagina          text,
  problemas       text[] not null default '{}',
  dirigido_a      text,
  metodo          text,
  cobertura       boolean not null default false,
  orden           smallint not null default 0,
  publicado       boolean not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  3.5 EQUIPO
-- ----------------------------------------------------------------------------
create table if not exists public.team_members (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  nombre          text not null,
  cargo           text not null default '',
  iniciales       varchar(3),
  linkedin_url    text,
  sinopsis        text not null default '',
  foto_url        text,
  orden           smallint not null default 0,
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  constraint team_iniciales_largo check (iniciales is null or char_length(iniciales) between 1 and 3)
);

-- ----------------------------------------------------------------------------
--  3.6 CATEGORÍAS DE ACTUALIDAD JURÍDICA
-- ----------------------------------------------------------------------------
create table if not exists public.publication_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  nombre      text not null,
  orden       smallint not null default 0,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  3.7 PUBLICACIONES
--  "fecha" es date (no texto): el sitio la formatea en es-CO al mostrarla.
-- ----------------------------------------------------------------------------
create table if not exists public.publications (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  titulo          text not null,
  categoria_id    uuid references public.publication_categories (id) on delete set null,
  autora_id       uuid references public.team_members (id) on delete set null,
  autora_nombre   text,
  fecha           date,
  resumen         text not null default '',
  contenido       text,
  imagen_url      text,
  pdf_url         text,
  estado          public.estado_publicacion not null default 'borrador',
  destacado       boolean not null default false,
  orden           smallint not null default 0,
  publicado_en    timestamptz,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  3.8 CARRUSEL DE LA PÁGINA DE INICIO
-- ----------------------------------------------------------------------------
create table if not exists public.carousel_slides (
  id              uuid primary key default gen_random_uuid(),
  imagen_url      text not null,
  titulo_es       text not null default '',
  texto_es        text not null default '',
  titulo_en       text not null default '',
  texto_en        text not null default '',
  enlace          text,
  orden           smallint not null default 0,
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  3.9 VERSIONES DE LA POLÍTICA DE TRATAMIENTO DE DATOS
-- ----------------------------------------------------------------------------
create table if not exists public.data_policy_versions (
  id              uuid primary key default gen_random_uuid(),
  version         text not null unique,
  vigente_desde   date not null,
  resumen         text,
  contenido_url   text,
  publicada       boolean not null default true,
  creado_en       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  3.10 SOLICITUDES (formulario de contacto + "Mi cuenta")
--  El código legible (MAA-000001) sale del id, así no hay carreras.
--  area_nombre guarda una copia del nombre del área: si mañana se renombra
--  o se borra, la solicitud histórica conserva lo que el cliente eligió.
-- ----------------------------------------------------------------------------
create table if not exists public.contact_requests (
  id              bigint generated always as identity primary key,
  codigo          text generated always as ('MAA-' || lpad(id::text, 6, '0')) stored,
  cliente_id      uuid references public.profiles (id) on delete set null,
  tipo            public.tipo_solicitud not null default 'contacto',
  area_id         uuid references public.practice_areas (id) on delete set null,
  area_nombre     text,
  nombre          text not null,
  apellido        text,
  nombre_completo text generated always as
                    (btrim(nombre || ' ' || coalesce(apellido, ''))) stored,
  correo          text not null,
  telefono        text,
  mensaje         text not null,
  estado          public.estado_solicitud not null default 'recibida',
  origen          text not null default 'sitio',
  user_agent      text,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  constraint solicitudes_correo_formato check (correo ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  constraint solicitudes_nombre_largo check (char_length(btrim(nombre)) between 1 and 120),
  constraint solicitudes_mensaje_largo check (char_length(btrim(mensaje)) between 1 and 8000)
);

-- ----------------------------------------------------------------------------
--  3.11 PRUEBAS DE AUTORIZACIÓN (Ley 1581 de 2012)
--  Evidencia de que la persona aceptó la política y qué versión estaba vigente.
--  No se actualizan ni se borran: son prueba.
-- ----------------------------------------------------------------------------
create table if not exists public.consent_records (
  id                    bigint generated always as identity primary key,
  solicitud_id          bigint references public.contact_requests (id) on delete set null,
  cliente_id            uuid references public.profiles (id) on delete set null,
  nombre                text not null,
  correo                text not null,
  casilla_obligatoria   boolean not null default true,
  casilla_boletin       boolean not null default false,
  version_politica      text not null,
  aceptado_en           timestamptz not null default now(),
  user_agent            text,
  constraint consentimiento_obligatorio check (casilla_obligatoria),
  constraint consentimiento_correo_formato check (correo ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

-- ----------------------------------------------------------------------------
--  3.12 BOLETÍN
-- ----------------------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  id          uuid primary key default gen_random_uuid(),
  correo      text not null,
  nombre      text,
  activo      boolean not null default true,
  origen      text not null default 'sitio',
  creado_en   timestamptz not null default now(),
  constraint newsletter_correo_formato check (correo ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

-- ----------------------------------------------------------------------------
--  3.13 HISTORIAL DE ESTADOS DE UNA SOLICITUD
-- ----------------------------------------------------------------------------
create table if not exists public.request_status_history (
  id              bigint generated always as identity primary key,
  solicitud_id    bigint not null references public.contact_requests (id) on delete cascade,
  estado_anterior public.estado_solicitud,
  estado_nuevo    public.estado_solicitud not null,
  nota            text,
  cambiado_por    uuid references public.profiles (id) on delete set null,
  cambiado_en     timestamptz not null default now()
);

-- ============================================================================
--  4. ÍNDICES
-- ============================================================================

create unique index if not exists profiles_usuario_lower_idx
  on public.profiles (lower(usuario)) where usuario is not null;

create unique index if not exists profiles_correo_lower_idx
  on public.profiles (lower(correo)) where correo is not null;

create index if not exists profiles_rol_idx
  on public.profiles (rol) where activo;

create index if not exists practice_areas_orden_idx
  on public.practice_areas (orden) where publicado;

create index if not exists team_members_orden_idx
  on public.team_members (orden) where activo;

create index if not exists publications_estado_fecha_idx
  on public.publications (estado, fecha desc nulls last);

create index if not exists publications_categoria_idx
  on public.publications (categoria_id);

create index if not exists publications_busqueda_idx
  on public.publications
  using gin (to_tsvector('spanish', titulo || ' ' || coalesce(resumen, '')));

create index if not exists carousel_slides_orden_idx
  on public.carousel_slides (orden) where activo;

create index if not exists contact_requests_estado_idx
  on public.contact_requests (estado, creado_en desc);

create index if not exists contact_requests_cliente_idx
  on public.contact_requests (cliente_id, creado_en desc);

create index if not exists contact_requests_correo_idx
  on public.contact_requests (lower(correo));

create index if not exists contact_requests_nombre_trgm_idx
  on public.contact_requests using gin (nombre_completo gin_trgm_ops);

create index if not exists contact_requests_correo_trgm_idx
  on public.contact_requests using gin (correo gin_trgm_ops);

create index if not exists contact_requests_mensaje_trgm_idx
  on public.contact_requests using gin (mensaje gin_trgm_ops);

create index if not exists consent_records_correo_idx
  on public.consent_records (lower(correo), aceptado_en desc);

create index if not exists consent_records_solicitud_idx
  on public.consent_records (solicitud_id);

create unique index if not exists newsletter_correo_lower_idx
  on public.newsletter_subscribers (lower(correo));

create index if not exists request_history_solicitud_idx
  on public.request_status_history (solicitud_id, cambiado_en desc);

-- ============================================================================
--  5. TRIGGERS
-- ============================================================================

-- actualizado_en ------------------------------------------------------------
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_firm_settings_updated on public.firm_settings;
create trigger trg_firm_settings_updated
  before update on public.firm_settings
  for each row execute function public.set_updated_at();

drop trigger if exists trg_practice_areas_updated on public.practice_areas;
create trigger trg_practice_areas_updated
  before update on public.practice_areas
  for each row execute function public.set_updated_at();

drop trigger if exists trg_team_members_updated on public.team_members;
create trigger trg_team_members_updated
  before update on public.team_members
  for each row execute function public.set_updated_at();

drop trigger if exists trg_publications_updated on public.publications;
create trigger trg_publications_updated
  before update on public.publications
  for each row execute function public.set_updated_at();

drop trigger if exists trg_carousel_updated on public.carousel_slides;
create trigger trg_carousel_updated
  before update on public.carousel_slides
  for each row execute function public.set_updated_at();

drop trigger if exists trg_contact_requests_updated on public.contact_requests;
create trigger trg_contact_requests_updated
  before update on public.contact_requests
  for each row execute function public.set_updated_at();

-- Slugs automáticos ---------------------------------------------------------
create or replace function public.set_slug_publicacion()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := public.slugify(new.titulo);
  else
    new.slug := public.slugify(new.slug);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_publications_slug on public.publications;
create trigger trg_publications_slug
  before insert or update of titulo, slug on public.publications
  for each row execute function public.set_slug_publicacion();

create or replace function public.set_slug_equipo()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := public.slugify(new.nombre);
  else
    new.slug := public.slugify(new.slug);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_team_members_slug on public.team_members;
create trigger trg_team_members_slug
  before insert or update of nombre, slug on public.team_members
  for each row execute function public.set_slug_equipo();

-- Fecha de publicación ------------------------------------------------------
create or replace function public.set_publicado_en()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'publicado' and new.publicado_en is null then
    new.publicado_en := now();
  end if;
  if new.estado <> 'publicado' then
    new.publicado_en := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_publications_published_at on public.publications;
create trigger trg_publications_published_at
  before insert or update of estado on public.publications
  for each row execute function public.set_publicado_en();

-- Perfil automático al registrarse ------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre      text;
  v_apellido    text;
  v_usuario     text;
  v_base        text;
  v_intento     int := 0;
  v_iniciales   text;
begin
  v_nombre := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'nombre'), ''),
    split_part(coalesce(new.email, 'cliente'), '@', 1)
  );
  v_apellido := nullif(btrim(new.raw_user_meta_data ->> 'apellido'), '');

  v_base := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'usuario'), ''),
    split_part(coalesce(new.email, 'cliente'), '@', 1)
  );
  v_base := public.slugify(v_base);
  if v_base = '' then
    v_base := 'cliente';
  end if;
  -- profiles exige usuario de 3+ caracteres: si es corto, se completa.
  if char_length(v_base) < 3 then
    v_base := 'cliente' || v_base;
  end if;

  v_usuario := v_base;
  while exists (select 1 from public.profiles where lower(usuario) = lower(v_usuario)) loop
    v_intento := v_intento + 1;
    v_usuario := v_base || v_intento::text;
  end loop;

  select upper(left(string_agg(left(palabra, 1), ''), 2))
    into v_iniciales
  from regexp_split_to_table(
         coalesce(v_nombre, '') || ' ' || coalesce(v_apellido, ''),
         '\s+'
       ) as palabra
  where palabra <> '';

  insert into public.profiles (id, usuario, nombre, apellido, correo, telefono, iniciales, rol)
  values (
    new.id,
    v_usuario,
    v_nombre,
    v_apellido,
    lower(new.email),
    case
      when char_length(btrim(coalesce(new.raw_user_meta_data ->> 'telefono', ''))) between 7 and 25
        then btrim(new.raw_user_meta_data ->> 'telefono')
      else null
    end,
    nullif(v_iniciales, ''),
    'cliente'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un cliente no puede subirse el rol ni reactivarse a sí mismo -------------
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() es null cuando se ejecuta desde el SQL Editor o service_role.
  if auth.uid() is not null and not public.is_admin() then
    if new.rol is distinct from old.rol
       or new.activo is distinct from old.activo
       or new.correo is distinct from old.correo then
      raise exception 'Solo un administrador puede cambiar el rol, el estado o el correo de una cuenta';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_protect on public.profiles;
create trigger trg_profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Historial automático de estados ------------------------------------------
create or replace function public.log_request_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado is distinct from old.estado then
    insert into public.request_status_history
      (solicitud_id, estado_anterior, estado_nuevo, cambiado_por)
    values
      (new.id, old.estado, new.estado, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_contact_requests_status on public.contact_requests;
create trigger trg_contact_requests_status
  after update of estado on public.contact_requests
  for each row execute function public.log_request_status();

-- ============================================================================
--  6. FUNCIÓN PÚBLICA PARA ENVIAR UNA SOLICITUD
--  Inserta la solicitud y la prueba de autorización en una sola transacción.
--  Es lo que debe llamar el formulario del sitio:
--    supabase.rpc('enviar_solicitud', { p_nombre, p_correo, p_mensaje, ... })
-- ============================================================================
create or replace function public.enviar_solicitud(
  p_nombre             text,
  p_correo             text,
  p_mensaje            text,
  p_apellido           text default null,
  p_telefono           text default null,
  p_area_slug          text default null,
  p_boletin            boolean default false,
  p_version_politica   text default null,
  p_acepta_politica    boolean default true,
  p_tipo               public.tipo_solicitud default 'contacto'
)
returns table (id bigint, codigo text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id       bigint;
  v_area     public.practice_areas%rowtype;
  v_uid      uuid := auth.uid();
  v_version  text;
begin
  if coalesce(btrim(p_nombre), '') = '' then
    raise exception 'El nombre es obligatorio';
  end if;
  if p_correo is null or p_correo !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'El correo no es válido';
  end if;
  if coalesce(btrim(p_mensaje), '') = '' then
    raise exception 'El mensaje es obligatorio';
  end if;
  if char_length(btrim(p_mensaje)) > 8000 then
    raise exception 'El mensaje supera el máximo de 8000 caracteres';
  end if;
  if not coalesce(p_acepta_politica, false) then
    raise exception 'Debe aceptar la política de tratamiento de datos';
  end if;
  -- Freno básico contra spam: máximo 5 solicitudes por correo cada hora.
  if (select count(*) from public.contact_requests r
       where lower(r.correo) = lower(btrim(p_correo))
         and r.creado_en > now() - interval '1 hour') >= 5 then
    raise exception 'Demasiadas solicitudes seguidas. Intente de nuevo más tarde';
  end if;

  if p_area_slug is not null and btrim(p_area_slug) <> '' then
    select pa.* into v_area
    from public.practice_areas pa
    where pa.slug = p_area_slug;

    if not found then
      raise exception 'El área de práctica indicada no existe';
    end if;
  end if;

  insert into public.contact_requests
    (cliente_id, tipo, area_id, area_nombre, nombre, apellido,
     correo, telefono, mensaje, estado, origen)
  values
    (v_uid, coalesce(p_tipo, 'contacto'), v_area.id, v_area.titulo,
     btrim(p_nombre), nullif(btrim(p_apellido), ''),
     lower(btrim(p_correo)), nullif(btrim(p_telefono), ''),
     btrim(p_mensaje), 'recibida', 'sitio')
  returning public.contact_requests.id into v_id;

  v_version := coalesce(
    nullif(btrim(p_version_politica), ''),
    (select dp.version
       from public.data_policy_versions dp
      where dp.publicada
      order by dp.vigente_desde desc
      limit 1),
    'sin versión'
  );

  insert into public.consent_records
    (solicitud_id, cliente_id, nombre, correo,
     casilla_obligatoria, casilla_boletin, version_politica)
  values
    (v_id, v_uid,
     btrim(p_nombre) || coalesce(' ' || nullif(btrim(p_apellido), ''), ''),
     lower(btrim(p_correo)), true, coalesce(p_boletin, false), v_version);

  return query
    select r.id, r.codigo
    from public.contact_requests r
    where r.id = v_id;
end;
$$;

-- El login es por correo: ya no se usa email_for_username (revelaba qué usuarios existen).
drop function if exists public.email_for_username(text);

grant execute on function public.enviar_solicitud(text, text, text, text, text, text, boolean, text, boolean, public.tipo_solicitud)
  to anon, authenticated;

-- ============================================================================
--  7. ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles              enable row level security;
alter table public.firm_settings         enable row level security;
alter table public.social_links          enable row level security;
alter table public.practice_areas        enable row level security;
alter table public.team_members          enable row level security;
alter table public.publication_categories enable row level security;
alter table public.publications          enable row level security;
alter table public.carousel_slides       enable row level security;
alter table public.data_policy_versions  enable row level security;
alter table public.contact_requests      enable row level security;
alter table public.consent_records       enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.request_status_history enable row level security;

-- 7.1 PERFILES --------------------------------------------------------------
drop policy if exists "perfil_propio_select" on public.profiles;
create policy "perfil_propio_select"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "perfiles_staff_select" on public.profiles;
create policy "perfiles_staff_select"
  on public.profiles for select
  to authenticated
  using (public.is_staff());

drop policy if exists "perfil_propio_update" on public.profiles;
create policy "perfil_propio_update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "perfiles_staff_insert" on public.profiles;
create policy "perfiles_staff_insert"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "perfiles_staff_update" on public.profiles;
create policy "perfiles_staff_update"
  on public.profiles for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "perfiles_admin_delete" on public.profiles;
create policy "perfiles_admin_delete"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

-- 7.2 CONTENIDO PÚBLICO -----------------------------------------------------
drop policy if exists "firm_settings_lectura" on public.firm_settings;
create policy "firm_settings_lectura"
  on public.firm_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "firm_settings_staff" on public.firm_settings;
create policy "firm_settings_staff"
  on public.firm_settings for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "social_links_lectura" on public.social_links;
create policy "social_links_lectura"
  on public.social_links for select
  to anon, authenticated
  using (activo);

drop policy if exists "social_links_staff" on public.social_links;
create policy "social_links_staff"
  on public.social_links for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "practice_areas_lectura" on public.practice_areas;
create policy "practice_areas_lectura"
  on public.practice_areas for select
  to anon, authenticated
  using (publicado);

drop policy if exists "practice_areas_staff" on public.practice_areas;
create policy "practice_areas_staff"
  on public.practice_areas for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "team_members_lectura" on public.team_members;
create policy "team_members_lectura"
  on public.team_members for select
  to anon, authenticated
  using (activo);

drop policy if exists "team_members_staff" on public.team_members;
create policy "team_members_staff"
  on public.team_members for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "publication_categories_lectura" on public.publication_categories;
create policy "publication_categories_lectura"
  on public.publication_categories for select
  to anon, authenticated
  using (activo);

drop policy if exists "publication_categories_staff" on public.publication_categories;
create policy "publication_categories_staff"
  on public.publication_categories for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "publications_lectura" on public.publications;
create policy "publications_lectura"
  on public.publications for select
  to anon, authenticated
  using (estado = 'publicado' and (publicado_en is null or publicado_en <= now()));

drop policy if exists "publications_staff" on public.publications;
create policy "publications_staff"
  on public.publications for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "carousel_slides_lectura" on public.carousel_slides;
create policy "carousel_slides_lectura"
  on public.carousel_slides for select
  to anon, authenticated
  using (activo);

drop policy if exists "carousel_slides_staff" on public.carousel_slides;
create policy "carousel_slides_staff"
  on public.carousel_slides for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "data_policy_versions_lectura" on public.data_policy_versions;
create policy "data_policy_versions_lectura"
  on public.data_policy_versions for select
  to anon, authenticated
  using (publicada);

drop policy if exists "data_policy_versions_staff" on public.data_policy_versions;
create policy "data_policy_versions_staff"
  on public.data_policy_versions for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- 7.3 SOLICITUDES -----------------------------------------------------------
-- Cualquiera puede crear una; nadie puede leer las de otros.
drop policy if exists "solicitudes_insert_publico" on public.contact_requests;

drop policy if exists "solicitudes_propias_select" on public.contact_requests;
create policy "solicitudes_propias_select"
  on public.contact_requests for select
  to authenticated
  using (
    cliente_id = auth.uid()
    or (
      (auth.jwt() ->> 'email') is not null
      and lower(correo) = lower(auth.jwt() ->> 'email')
    )
  );

drop policy if exists "solicitudes_staff_select" on public.contact_requests;
create policy "solicitudes_staff_select"
  on public.contact_requests for select
  to authenticated
  using (public.is_staff());

drop policy if exists "solicitudes_staff_update" on public.contact_requests;
create policy "solicitudes_staff_update"
  on public.contact_requests for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "solicitudes_admin_delete" on public.contact_requests;
create policy "solicitudes_admin_delete"
  on public.contact_requests for delete
  to authenticated
  using (public.is_admin());

-- 7.4 PRUEBAS DE AUTORIZACIÓN (solo se insertan y solo las lee el personal) --
drop policy if exists "consentimientos_insert_publico" on public.consent_records;

drop policy if exists "consentimientos_staff_select" on public.consent_records;
create policy "consentimientos_staff_select"
  on public.consent_records for select
  to authenticated
  using (public.is_staff());

-- 7.5 BOLETÍN ---------------------------------------------------------------
drop policy if exists "boletin_insert_publico" on public.newsletter_subscribers;

drop policy if exists "boletin_staff_select" on public.newsletter_subscribers;
create policy "boletin_staff_select"
  on public.newsletter_subscribers for select
  to authenticated
  using (public.is_staff());

drop policy if exists "boletin_staff_update" on public.newsletter_subscribers;
create policy "boletin_staff_update"
  on public.newsletter_subscribers for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "boletin_staff_delete" on public.newsletter_subscribers;
create policy "boletin_staff_delete"
  on public.newsletter_subscribers for delete
  to authenticated
  using (public.is_staff());

-- 7.6 HISTORIAL DE ESTADOS -------------------------------------------------
drop policy if exists "historial_staff_select" on public.request_status_history;
create policy "historial_staff_select"
  on public.request_status_history for select
  to authenticated
  using (public.is_staff());

drop policy if exists "historial_staff_insert" on public.request_status_history;
create policy "historial_staff_insert"
  on public.request_status_history for insert
  to authenticated
  with check (public.is_staff());

-- ============================================================================
--  8. PERMISOS
-- ============================================================================

grant usage on schema public to anon, authenticated;

grant select on
  public.firm_settings,
  public.social_links,
  public.practice_areas,
  public.team_members,
  public.publication_categories,
  public.publications,
  public.carousel_slides,
  public.data_policy_versions
to anon, authenticated;

grant select, insert, update, delete on
  public.firm_settings,
  public.social_links,
  public.practice_areas,
  public.team_members,
  public.publication_categories,
  public.publications,
  public.carousel_slides,
  public.data_policy_versions,
  public.profiles,
  public.contact_requests,
  public.newsletter_subscribers,
  public.request_status_history
to authenticated;

-- Solicitudes, consentimientos y boletín entran SOLO por las funciones
-- enviar_solicitud() y suscribir_boletin() (validan y son atómicas).
revoke insert on public.contact_requests, public.consent_records, public.newsletter_subscribers
  from anon, authenticated;

grant select on public.contact_requests, public.consent_records
to authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

-- ============================================================================
--  9. STORAGE
--  "media": logo, imágenes de publicaciones y carrusel.
--  "documentos": PDF de las publicaciones.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 5242880,
   array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('documentos', 'documentos', true, 20971520,
   array['application/pdf'])
on conflict (id) do nothing;

-- Los buckets son públicos: las URLs funcionan sin política. Listar el
-- contenido de los buckets queda solo para el personal.
drop policy if exists "media_lectura_publica" on storage.objects;
drop policy if exists "media_lectura_staff" on storage.objects;
create policy "media_lectura_staff"
  on storage.objects for select
  to authenticated
  using (bucket_id in ('media', 'documentos') and public.is_staff());

drop policy if exists "media_escritura_staff" on storage.objects;
create policy "media_escritura_staff"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('media', 'documentos') and public.is_staff());

drop policy if exists "media_actualizacion_staff" on storage.objects;
create policy "media_actualizacion_staff"
  on storage.objects for update
  to authenticated
  using (bucket_id in ('media', 'documentos') and public.is_staff())
  with check (bucket_id in ('media', 'documentos') and public.is_staff());

drop policy if exists "media_borrado_staff" on storage.objects;
create policy "media_borrado_staff"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('media', 'documentos') and public.is_staff());

-- ============================================================================
-- 10. REALTIME (bandeja del panel: las solicitudes entran en vivo)
-- ============================================================================

do $$
begin
  execute 'alter publication supabase_realtime add table public.contact_requests';
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- ============================================================================
-- 11. DATOS INICIALES (los que hoy están en sitio.js / admin.js)
-- ============================================================================

insert into public.firm_settings (
  id, nombre, grupo, titulo_pagina, descripcion, cobertura, nit, color_marca,
  telefono, telefono_enlace, telefono_alterno, whatsapp_numero, whatsapp_mensaje,
  correo_principal, correo_datos, correo_alterno,
  direccion_bogota, ciudad_bogota, direccion_corta, mapa_url,
  direccion_madrid, ciudad_madrid, sitio_web, sitio_web_espana,
  horario, horario_sabado, horario_pie, formulario_destino
)
values (
  1,
  'Montes Abogados Asociados S.A.S.',
  'Montes Group',
  'ABOGADOS COLOMBIA · Montes Abogados Asociados S.A.S.',
  'Montes Abogados Asociados S.A.S. · Firma jurídica colombiana. Bogotá, Colombia.',
  'Sede en Bogotá D.C. · Cobertura nacional',
  '900.383.659-0',
  '#006cb7',
  '+57 300 72 57 266',
  '+573007257266',
  '+57 601 467 2868',
  '573007257266',
  'Hola, me gustaría recibir información sobre sus servicios de asesoría jurídica.',
  'claudia@montes-a.com',
  'lucy@montes-a.com',
  'contacto@mwabogados.com',
  'Calle 106 # 58-27, Oficina 706',
  'Bogotá D.C., Colombia',
  'Calle 106 # 58-27, Oficina 706, Bogotá D.C.',
  'https://www.google.com/maps/search/?api=1&query=Calle+106+%2358-27+oficina+706+Bogota',
  'Calle Monte Esquinza 30, bajo izquierda, 28010',
  'Madrid, España',
  'montes-abogados-asociados.pages.dev',
  'www.mwabogados.net',
  'Lunes a viernes: 8:00 a.m. – 6:00 p.m.',
  'Sábados: 8:00 a.m. – 12:00 p.m.',
  'Lun – Vie: 8am – 6pm',
  'claudia@montes-a.com'
)
on conflict (id) do nothing;

insert into public.social_links (nombre, icono, url, orden)
values
  ('Instagram', 'instagram', 'https://www.instagram.com/montesabogadosasoc/', 1),
  ('Facebook',  'facebook',  'https://www.facebook.com/profile.php?id=61557949184503', 2),
  ('LinkedIn',  'linkedin',  'https://www.linkedin.com/company/montes-abogados-asociados/?viewAsMember=true', 3),
  ('WhatsApp',  'whatsapp',  'https://wa.me/573007257266', 4)
on conflict (nombre) do nothing;

insert into public.publication_categories (slug, nombre, orden)
values
  ('articulos',    'Artículos',             1),
  ('jurisprudencia','Jurisprudencia',       2),
  ('normativa',    'Novedades normativas',  3),
  ('prensa',       'Notas de prensa',       4)
on conflict (slug) do nothing;

insert into public.practice_areas
  (numero, slug, titulo, corto, bloque, texto, icono, pagina,
   problemas, dirigido_a, metodo, cobertura, orden)
values
  (
    '01', 'comercial', 'Derecho Comercial y Contratos', 'Comercial y Contratos',
    'preventiva',
    'Asesoramos a empresas en sus operaciones comerciales y en la negociación, redacción y revisión de contratos, para prevenir riesgos y proteger sus intereses.',
    'comercial', 'area-comercial.html',
    array[
      'Contratos que no reflejan lo que la empresa realmente quiere o necesita.',
      'Operaciones comerciales que se hacen sin respaldo jurídico suficiente.'
    ],
    'Empresas y empresarios que firman contratos, venden o compran dentro y fuera de Colombia.',
    'Revisamos la documentación antes de firmarla, la ajustamos a la operación real de la empresa y acompañamos la negociación para que no queden vacíos.',
    false, 1
  ),
  (
    '02', 'laboral', 'Derecho Laboral y Seguridad Social', 'Laboral y Seg. Social',
    'preventiva',
    'Acompañamos a nuestros clientes en contratación, cumplimiento de obligaciones laborales y de seguridad social, terminaciones y reclamaciones.',
    'laboral', 'area-laboral.html',
    array[
      'Contrataciones sin los documentos completos o sin afiliar a tiempo.',
      'Terminaciones y reclamaciones que se manejan con información incompleta.'
    ],
    'Empresas con equipo de trabajo y administradores que necesitan respaldo en la relación laboral.',
    'Hacemos un diagnóstico de la documentación laboral, ponemos en orden las obligaciones pendientes y acompañamos las situaciones delicadas desde el principio.',
    false, 2
  ),
  (
    '03', 'administrativo', 'Derecho Administrativo', 'Administrativo',
    'preventiva',
    'Acompañamos a empresas en sus trámites y actuaciones ante entidades públicas, en la presentación de recursos y en los procesos ante la jurisdicción de lo contencioso administrativo.',
    'administrativo', 'area-administrativo.html',
    array[
      'Trámites ante entidades públicas que se atrasan o se pierden.',
      'Recursos y actuaciones que no se presentan dentro del término.'
    ],
    'Empresas que se relacionan con entidades públicas por licencias, contratos y contribuciones.',
    'Acompañamos el trámite paso a paso y preparamos los recursos con argumentos claros y documentación soportada.',
    false, 3
  ),
  (
    '04', 'migratorio', 'Derecho Migratorio', 'Migratorio',
    'preventiva',
    'Asesoramos a empresas y a sus colaboradores extranjeros en la obtención de visas y permisos, y en el cumplimiento de sus obligaciones ante Migración Colombia y la Cancillería.',
    'migratorio', 'area-migratorio.html',
    array[
      'Visas y permisos que no salen a tiempo para la fecha de ingreso del colaborador.',
      'Colaboradores extranjeros que no cumplen los requisitos ni las obligaciones del caso.'
    ],
    'Empresas con colaboradores extranjeros y familias que necesitan un permiso o una visa.',
    'Revisamos el expediente antes de presentarlo, acompañamos cada trámite ante Migración Colombia y la Cancillería y verificamos las obligaciones posteriores.',
    false, 4
  ),
  (
    '05', 'litigio', 'Litigio Civil y Comercial', 'Litigio Civil y Comercial',
    'litigio',
    'Representamos a nuestros clientes en procesos en cualquier ciudad del país.',
    'responsabilidad', 'area-litigio.html',
    array[
      'Conflictos patrimoniales o comerciales que no encuentran una salida negociada.',
      'Cuentas por cobrar que, con el tiempo, dejan de ser exigibles.'
    ],
    'Empresas y empresarios con conflictos que necesitan representación y estrategia procesal.',
    'Definimos una estrategia desde el inicio, evaluamos si conviene negociar o litigar, y si vamos a juicio lo preparamos con tiempo y con los documentos completos.',
    true, 5
  ),
  (
    '06', 'recaudo', 'Recaudo de Cartera', 'Recaudo de Cartera',
    'litigio',
    'Gestionamos el cobro prejurídico y jurídico de obligaciones para ayudar a las empresas a recuperar su cartera de forma eficiente y conforme a la ley.',
    'cartera', 'area-recaudo.html',
    array[
      'Cartera que envejece y que nadie gestiona porque falta seguimiento.',
      'Deudores que no responden a los canales de contacto permitidos.'
    ],
    'Empresas con cartera por cobrar que necesitan recuperarla sin perder la relación comercial.',
    'Gestionamos el cobro prejurídico y jurídico de obligaciones para ayudar a las empresas a recuperar su cartera de forma eficiente y conforme a la ley.',
    true, 6
  ),
  (
    '07', 'insolvencia', 'Insolvencia Empresarial', 'Insolvencia Empresarial',
    'litigio',
    'Representamos a acreedores, personas naturales y jurídicas, en procesos de reorganización, liquidación y demás trámites de insolvencia, para proteger y hacer valer sus créditos.',
    'societario', 'area-insolvencia.html',
    array[
      'Deudores que entran en reorganización o liquidación y la firma no alcanza a defender sus derechos.',
      'Acreedores que no saben cuáles son los pasos ni los plazos del proceso.'
    ],
    'Acreedores, personas naturales y jurídicas que necesitan proteger y hacer valer sus créditos.',
    'Revisamos el caso, representamos al acreedor en el proceso de reorganización o liquidación y defendemos sus derechos en cada etapa.',
    true, 7
  )
on conflict (slug) do nothing;

insert into public.team_members (slug, nombre, cargo, iniciales, linkedin_url, sinopsis, orden)
values
  (
    'claudia-montes-castro',
    'Claudia Marcela Montes Castro',
    'Cofundadora y Directora General',
    'CM',
    null,
    'Abogada de la Universidad del Rosario y especialista en Derecho Laboral y de la Seguridad Social, con más de doce años de ejercicio profesional. Antes de asumir la dirección de MAA trabajó en la Rama Judicial, donde vio de primera mano cómo se estudian y se deciden los casos: esa experiencia marca su forma de ejercer y la prepara pensando en cómo lo va a leer el juez. Cofundó MAA en 2010 junto a Lucy Montes y desde 2018 dirige la firma, donde lidera la asesoría jurídica y la defensa judicial. Se caracteriza por su trato directo, por explicar con claridad los riesgos y las opciones de cada caso y por acompañar a sus clientes de principio a fin, con amplia experiencia en empresas multinacionales y en negocios internacionales.',
    1
  ),
  (
    'lucy-montes-castro',
    'Lucy Montes Castro',
    'Cofundadora',
    'LM',
    null,
    'Abogada de la Universidad Libre, especialista en Derecho Administrativo de la misma universidad y en Derecho Tributario de la Universidad del Rosario. Cofundó MAA en 2010 junto a Claudia Montes. Su formación en derecho administrativo y tributario complementa la práctica de la firma y aporta una visión clave para las empresas en su relación con el Estado y con las autoridades tributarias. Se caracteriza por su capacidad para anticipar los efectos de una decisión pública sobre la operación de una empresa y por su compromiso con un trabajo riguroso, ordenado y cercano al cliente.',
    2
  ),
  (
    'jorge-montes-castro',
    'Jorge Montes Castro',
    'Asociado Senior',
    'JM',
    null,
    'Abogado especializado en derecho comercial, con experiencia en la gestión de cartera y en cobranza prejurídica y judicial, en negociación de relacionamientos comerciales y en la revisión y negociación de contratos. Se caracteriza por su conocimiento práctico del cobro, por su capacidad para diseñar rutas de recuperación que respetan la ley y por su compromiso con el cumplimiento de los términos procesales y con el resultado de la firma.',
    3
  ),
  (
    'daniel-bertel-paternina',
    'Daniel Bertel Paternina',
    'Auxiliar Jurídico',
    'DB',
    null,
    'Profesional en formación en Derecho, actualmente cursando IV semestre, con experiencia en apoyo jurídico, revisión de expedientes, seguimiento de procesos judiciales y elaboración de documentos jurídicos. Se caracteriza por su organización, responsabilidad y capacidad de análisis jurídico, así como por su compromiso con el cumplimiento de los términos procesales y el desarrollo eficiente de las actividades propias del ámbito legal.',
    4
  ),
  (
    'laura-catalina-urrego-sastre',
    'Laura Catalina Urrego Sastre',
    'Abogada',
    'LU',
    null,
    'Abogada de la Universidad Militar Nueva Granada, actualmente cursa la Especialización en Derecho Empresarial y de los Negocios en la Universidad del Rosario. Su práctica se centra en el derecho civil, comercial, laboral y en la contratación estatal. Tiene experiencia en asesoría jurídica corporativa, elaboración y revisión de contratos, emisión de conceptos jurídicos, litigios y recuperación de cartera en todas sus etapas. Ha acompañado a empresas del sector de la construcción e infraestructura en la estructuración y ejecución de proyectos, manejo de pólizas y garantías, procesos de contratación pública y atención de requerimientos de órganos de control. Ha apoyado también asuntos laborales y reclamaciones ante aseguradoras. Se destaca por su asesoría jurídica integral y por su compromiso con la calidad en cada asunto.',
    5
  )
on conflict (slug) do nothing;

insert into public.publications
  (slug, titulo, categoria_id, autora_id, autora_nombre, fecha, resumen, estado, publicado_en)
values
  (
    'proteccion-constitucional-del-fuero-de-salud',
    'Protección constitucional del fuero de salud',
    (select id from public.publication_categories where slug = 'articulos'),
    (select id from public.team_members where slug = 'claudia-montes-castro'),
    'Claudia Montes Castro',
    date '2024-02-21',
    'Qué protege el fuero de salud en Colombia, cómo se invoca y qué pasos deben seguir el trabajador y la empresa cuando se presenta una situación de esta naturaleza.',
    'publicado', now()
  ),
  (
    'como-preparar-una-reorganizacion-societaria',
    'Cómo preparar una reorganización societaria',
    (select id from public.publication_categories where slug = 'articulos'),
    (select id from public.team_members where slug = 'lucy-montes-castro'),
    'Lucy Montes Castro',
    date '2024-05-12',
    'Los pasos que conviene revisar antes de una escisión, una fusión o una conversión de la compañía, y los documentos que hay que tener listos.',
    'publicado', now()
  ),
  (
    'ley-2300-2023-reglas-contacto-recaudo-cartera',
    'La Ley 2300 de 2023 y las nuevas reglas de contacto en el recaudo de cartera',
    (select id from public.publication_categories where slug = 'normativa'),
    (select id from public.team_members where slug = 'lucy-montes-castro'),
    'Lucy Montes Castro',
    date '2024-09-03',
    'Los canales, horarios y la frecuencia que permite la nueva norma en las gestiones de cobranza, y cómo afecta el manejo de la información del deudor.',
    'publicado', now()
  )
on conflict (slug) do nothing;

insert into public.data_policy_versions (version, vigente_desde, resumen, contenido_url, publicada)
values (
  '22 de octubre de 2026',
  date '2026-10-22',
  'Política de tratamiento de datos personales de Montes Abogados Asociados S.A.S.',
  'politica-datos.html',
  true
)
on conflict (version) do nothing;


-- ============================================================================
-- 11b. BOLETÍN (función pública, ignora duplicados sin revelar si existían)
-- ============================================================================
create or replace function public.suscribir_boletin(
  p_correo text,
  p_nombre text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_correo is null or p_correo !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'El correo no es válido';
  end if;
  insert into public.newsletter_subscribers (correo, nombre)
  values (lower(btrim(p_correo)), nullif(btrim(p_nombre), ''))
  on conflict (lower(correo)) do update set activo = true;
end;
$$;

grant execute on function public.suscribir_boletin(text, text) to anon, authenticated;

-- ============================================================================
-- 11c. TRADUCCIONES AL INGLÉS
--  El panel traduce solo y hoy guarda el resultado en datos.traducciones
--  ("servicios.0.titulo" -> {es, en}). Esta tabla lo reemplaza con la misma forma.
-- ============================================================================
create table if not exists public.site_translations (
  clave           text primary key,
  es              text not null,
  en              text not null default '',
  actualizado_en  timestamptz not null default now()
);

alter table public.site_translations enable row level security;

drop policy if exists "traducciones_lectura" on public.site_translations;
create policy "traducciones_lectura"
  on public.site_translations for select
  to anon, authenticated
  using (true);

drop policy if exists "traducciones_staff" on public.site_translations;
create policy "traducciones_staff"
  on public.site_translations for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on public.site_translations to anon, authenticated;
grant insert, update, delete on public.site_translations to authenticated;

drop trigger if exists trg_site_translations_updated on public.site_translations;
create trigger trg_site_translations_updated
  before update on public.site_translations
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 11d. AGENTE DE IA (conversaciones, propuestas, ideas, videos)
--  Solo editor/admin autenticados. El público solo ve propuestas aprobadas.
-- ============================================================================

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

-- ============================================================================
-- 12. VERIFICACIÓN RÁPIDA (ejecutar a mano si se quiere)
-- ============================================================================
-- select count(*) as areas from public.practice_areas;   -- 7
-- select count(*) as categorias from public.publication_categories; -- 4
-- select count(*) as equipo from public.team_members;
-- select count(*) as publicaciones from public.publications;
-- select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' order by tablename;
