-- =============================================================
-- ESQUEMA DEL AGENTE DE IA PARA SUPABASE
-- Pega este archivo en: Supabase > SQL Editor > New query > Run
-- Reglas de la ficha del cliente:
--   1) fotos reales del despacho, nada inventado
--   2) NADA se publica sin aprobacion (estado = 'pendiente')
--   3) NUNCA datos de clientes (cuedulas, correos, telefonos)
-- =============================================================

-- 1. Conversaciones del chat del administrador -----------------
create table if not exists conversaciones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null default 'Nueva conversacion',
  pestana text not null default 'chat',   -- chat | biblioteca | estilo
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

-- 2. Mensajes (historial que el agente usa para aprender) ------
create table if not exists mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references conversaciones(id) on delete cascade,
  rol text not null check (rol in ('usuario','asistente')),
  texto text not null,
  creado_en timestamptz not null default now()
);
create index if not exists mensajes_conversacion_idx
  on mensajes (conversacion_id, creado_en);

-- 3. Propuestas de contenido (aprobacion obligatoria) -----------
create table if not exists propuestas (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid references conversaciones(id) on delete set null,
  tipo text not null default 'post',       -- post | video | guion | carrusel
  texto text not null,
  estado text not null default 'pendiente'
          check (estado in ('pendiente','aprobada','rechazada')),
  -- donde quedara publicada si se aprueba
  destino text,                            -- instagram | facebook | sitio
  url_publicacion text,
  creado_en timestamptz not null default now(),
  decidida_en timestamptz
);
create index if not exists propuestas_estado_idx on propuestas (estado, creado_en);

-- 4. Aprendizaje: ideas y prompts que el agente propone ---------
create table if not exists aprendizaje (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('idea','prompt')),
  texto text not null,
  util boolean not null default false,     -- el admin marca lo que sirve
  veces_usado int not null default 0,
  creado_en timestamptz not null default now()
);

-- 5. Videos generados (avatar + Dreamina) -----------------------
create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  propuesta_id uuid references propuestas(id) on delete set null,
  guion text not null,
  estado text not null default 'pendiente'
          check (estado in ('pendiente','generando','listo','error')),
  url_video text,
  creado_en timestamptz not null default now()
);

-- =============================================================
-- SEGURIDAD (RLS): solo el panel autenticado puede escribir y
-- nadie publica nada sin pasar por 'pendiente'.
-- =============================================================
alter table conversaciones enable row level security;
alter table mensajes        enable row level security;
alter table propuestas      enable row level security;
alter table aprendizaje     enable row level security;
alter table videos          enable row level security;

-- Lectura general (anon) solo de lo aprobado y del menu publico
create policy "propuestas aprobadas son publicas"
  on propuestas for select
  using (estado = 'aprobada');

-- Escritura del panel: con la clave anon del admin (protegida por
-- el login del panel); en producción conviene sustituirla por
-- usuarios autenticados de Supabase Auth.
create policy "panel escribe propuestas"
  on propuestas for all
  using (true) with check (estado = 'pendiente');

create policy "panel gestiona conversaciones"
  on conversaciones for all using (true) with check (true);

create policy "panel gestiona mensajes"
  on mensajes for all using (true) with check (true);

create policy "panel gestiona aprendizaje"
  on aprendizaje for all using (true) with check (true);

create policy "panel gestiona videos"
  on videos for all using (true) with check (true);
