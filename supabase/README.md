# Base de datos para Supabase — Montes Abogados Asociados

Esquema completo para reemplazar el `localStorage` + `datos.json` del sitio
(`Montes-Abogados-Asociados-main`) por Postgres en Supabase.

- **Archivo SQL:** [`montes_supabase.sql`](./montes_supabase.sql)
- **Qué incluye:** tablas, índices, triggers, RLS, Storage, Realtime y los datos
  que hoy están escritos en `src/legacy/sitio.js` y `src/legacy/admin.js`.
- **Es idempotente:** se puede volver a ejecutar en el SQL Editor sin duplicar
  datos (usa `if not exists`, `on conflict do nothing` y `drop policy if exists`).

> **Orden de ejecución en el SQL Editor:**
> 1. `montes_supabase.sql` (obligatorio).
> 2. `esquema_agente_seguro.sql` (opcional, tablas del agente de IA).
> **No ejecutes `esquema.sql`**: es la versión antigua y deja las tablas del agente abiertas a cualquiera con la clave anon.

---

## 1. Cómo aplicarlo

1. Entra al proyecto en [supabase.com](https://supabase.com) → **SQL Editor**.
2. Pega todo el contenido de `montes_supabase.sql` y pulsa **Run**.
3. Revisa **Table Editor**: deben aparecer 13 tablas y 4 categorías, 7 áreas,
   5 integrantes del equipo y 3 publicaciones de ejemplo.
4. En **Storage** deben existir los buckets `media` (imágenes) y `documentos` (PDF).

Si usas la CLI:

```bash
supabase link --project-ref TU_PROJECT_REF
supabase db push          # o: psql "$DATABASE_URL" -f supabase/montes_supabase.sql
```

### Crear el primer administrador

1. **Authentication → Users → Add user**: crea el usuario con el correo de la
   firma (por ejemplo `claudia@montes-a.com`) y una contraseña.
2. El trigger `handle_new_user` crea automáticamente su fila en `profiles` con
   rol `cliente`.
3. En el SQL Editor, súbelo a administrador:

```sql
update public.profiles
   set rol = 'admin', nombre = 'Claudia Marcela', apellido = 'Montes Castro'
 where correo = 'claudia@montes-a.com';
```

Los demás usuarios del panel pueden quedar con rol `editor` (pueden editar
contenido y solicitudes, pero no borrar ni cambiar roles).

---

## 2. Modelo de datos

| Tabla | Reemplaza a | Contenido |
|---|---|---|
| `profiles` | `cuentasMontes` + `sesionMontes` | Perfil de cada usuario de Auth: usuario, nombre, correo, teléfono, rol |
| `firm_settings` | `datos.empresa` + `datos.contacto` | Fila única con nombre, NIT, colores, teléfonos, correos, direcciones, horarios |
| `social_links` | `REDES` | Instagram, Facebook, LinkedIn, WhatsApp |
| `practice_areas` | `SERVICIOS` / `datos.servicios` | 7 áreas con texto, problemas, dirigido a, método, cobertura |
| `team_members` | `EQUIPO` / `datos.equipo` | Abogados, cargos, iniciales, LinkedIn, sinopsis |
| `publication_categories` | `CATEGORIAS_ACTUALIDAD` | Artículos, Jurisprudencia, Novedades normativas, Notas de prensa |
| `publications` | `PUBLICACIONES` / `datos.publicaciones` | Publicaciones con fecha real, resumen, imagen, PDF y estado |
| `carousel_slides` | `datos.carrusel` | Diapositivas en español e inglés |
| `data_policy_versions` | `SITIO.versionPolitica` | Versiones de la política de tratamiento de datos |
| `contact_requests` | `solicitudesMontes` | Formulario de contacto y solicitudes de "Mi cuenta" |
| `consent_records` | `pruebasAutorizacionMontes` | Prueba de autorización (Ley 1581): qué aceptó, cuándo y con qué versión |
| `newsletter_subscribers` | casilla `boletin` | Suscriptores del boletín |
| `request_status_history` | — | Historial de cambios de estado de cada solicitud |

### Detalles pensados para el sitio actual

- **`contact_requests.codigo`** genera `MAA-000001` a partir del `id` (sin carreras).
- **`area_nombre`** guarda una copia del área elegida: si mañana se renombra o se
  elimina, la solicitud histórica conserva el texto original.
- **`consent_records`** no tiene políticas de `update` ni `delete`: es evidencia.
- **`publications.fecha`** es `date` (no texto). El sitio la formatea a
  `21 de febrero de 2024` con `toLocaleDateString("es-CO", ...)`.
- **`practice_areas.problemas`** es `text[]`, igual que el arreglo del código.
- **RPC `enviar_solicitud`** inserta solicitud + consentimiento en una sola
  transacción y devuelve el código. Es lo recomendado para el formulario.

---

## 3. Conectar el sitio (supabase-js)

```bash
npm install @supabase/supabase-js
```

```js
// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

`.env` (nunca subas la `service_role` al frontend):

```env
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

### Leer el contenido público

```js
const [{ data: firma }, { data: areas }, { data: equipo }, { data: publicaciones }] =
  await Promise.all([
    supabase.from("firm_settings").select("*").single(),
    supabase.from("practice_areas").select("*").order("orden"),
    supabase.from("team_members").select("*").order("orden"),
    supabase
      .from("publications")
      .select("*, categoria:publication_categories(nombre)")
      .order("fecha", { ascending: false }),
  ]);
```

### Enviar el formulario de contacto

```js
const { data, error } = await supabase.rpc("enviar_solicitud", {
  p_nombre: nombre,
  p_apellido: apellido,
  p_correo: correo,
  p_telefono: telefono,
  p_area_slug: area,          // comercial, laboral, administrativo, ...
  p_mensaje: mensaje,
  p_boletin: boletin,
  p_version_politica: "22 de octubre de 2026",
  p_acepta_politica: privacidad,
});
// data[0].codigo -> "MAA-000042"
```

### Iniciar sesión con nombre de usuario

El sitio actual entra con `usuario` + contraseña. Supabase Auth trabaja con
correo, así que hay dos caminos:

```js
// Opción A (recomendada): pedir el correo en el formulario
await supabase.auth.signInWithPassword({ email: correo, password: clave });

// Opción B: conservar el campo "usuario"
const { data: correo } = await supabase.rpc("email_for_username", {
  p_usuario: usuario,
});
if (correo) {
  await supabase.auth.signInWithPassword({ email: correo, password: clave });
}
```

> `email_for_username` revela si un usuario existe. Si eso te preocupa, usa la
> opción A o cambia el campo del formulario a "correo electrónico".

### Registro de clientes

```js
await supabase.auth.signUp({
  email: correo,
  password: clave,
  options: {
    data: {
      nombre: "Ana",
      apellido: "Pérez",
      telefono: "+57 300 000 0000",
      usuario: "anaperez",       // opcional: si no viene, se usa el correo
    },
  },
});
```

El trigger crea el perfil automáticamente, con rol `cliente`. Un cliente solo
puede ver **sus** solicitudes (`cliente_id = auth.uid()` o su correo del JWT).

### Panel de administración

```js
// Las políticas RLS dejan escribir solo a editor/admin.
await supabase.from("team_members").insert({ nombre, cargo, iniciales, sinopsis });
await supabase
  .from("contact_requests")
  .update({ estado: "respondida" })
  .eq("id", id);   // el trigger registra el cambio en el historial
```

Las solicitudes entran en vivo si el panel se suscribe a Realtime:

```js
supabase
  .channel("solicitudes")
  .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "contact_requests" },
      (payload) => agregarSolicitud(payload.new))
  .subscribe();
```

---

## 4. Seguridad (RLS)

| Tabla | `anon` | `cliente` autenticado | `editor` / `admin` |
|---|---|---|---|
| `firm_settings`, `social_links`, `practice_areas`, `team_members`, `publication_categories`, `publications`, `carousel_slides`, `data_policy_versions` | Solo lectura de lo publicado/activo | Igual | CRUD total |
| `profiles` | Sin acceso | Solo su perfil (y sin cambiar rol/estado) | Ver todos; admin cambia roles |
| `contact_requests` | Solo `insert` | `insert` y ver las suyas | Ver y actualizar todas; borrar solo admin |
| `consent_records` | Solo `insert` | Solo `insert` | Solo lectura |
| `newsletter_subscribers` | Solo `insert` | Solo `insert` | CRUD total |
| `request_status_history` | Sin acceso | Sin acceso | Lectura (la escritura la hace el trigger) |

Además:

- Los buckets `media` y `documentos` son públicos para lectura; solo el personal
  puede subir, reemplazar o borrar archivos.
- La función `protect_profile_fields` impide que un cliente se asigne `admin`.
- `enviar_solicitud` valida nombre, correo, mensaje y aceptación de la política
  antes de insertar.

---

## 5. Lo que falta hacer en el código (no lo toqué)

El zip solo trae el frontend; no modifiqué ningún archivo del proyecto. Para
terminar la migración hay que:

1. Reemplazar `obtenerDatosDelSitio()` y `buscarDatosGuardados()` por consultas
   a Supabase (o cargar un `SiteDataProvider` con React).
2. Cambiar `guardar()` del panel por `upsert` en `firm_settings`,
   `practice_areas`, `team_members`, `publications` y `carousel_slides`.
3. Reemplazar el login manual de `admin.js` y `sitio.js` por Supabase Auth.
4. Subir logo, imágenes y PDF a Storage y guardar solo las URLs públicas.
5. Enviar el correo de aviso al despacho con una Edge Function (por ejemplo
   Resend) disparada por `insert` en `contact_requests`; la base ya guarda todo
   aunque el correo falle.
6. Generar tipos para el cliente:

```bash
npx supabase gen types typescript --project-id TU_PROJECT_REF \
  > src/lib/database.types.ts
```

### Fuera del alcance (textos que siguen en el código)

`MAA` (misión, visión), `VALORES`, `RAZONES`, `OFERTAS`, `CULTURA_BLOQUES` e
`HISTORIA` no se editan desde el panel, así que no se modelaron. Si quieres
administrarlos, se puede agregar una tabla `site_content_blocks` (clave, texto
ES/EN, orden) sin tocar el resto del esquema.
