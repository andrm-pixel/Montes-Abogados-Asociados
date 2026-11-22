# Base de datos (Supabase)

Un solo archivo: **`montes_supabase_COMPLETO.sql`** (esquema del sitio + agente de IA + seguridad + datos iniciales).

## Cómo se aplica
1. Supabase → **SQL Editor → New query**.
2. Pega todo el contenido del archivo y pulsa **Run**. Se puede volver a correr sin dañar nada.
3. Crea tu usuario en **Authentication → Users** (con *Auto Confirm User*) y súbelo de rol:
   ```sql
   update public.profiles set rol = 'admin' where correo = 'tu@correo.com';
   ```

## Cómo se conecta el sitio
Variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (archivo `.env` en local, variables de entorno en Netlify).
Si faltan, el sitio sigue funcionando sin servidor (datos.json + navegador).

## Qué hay en la base
- **Público (lectura):** firma, áreas, equipo, publicaciones publicadas, carrusel, política vigente.
- **Solicitudes:** entran solo por `enviar_solicitud()`; el cliente ve las suyas, el personal ve todas.
- **Personal:** `rol = 'admin'` o `'editor'` en `profiles`. Solo admin cambia roles y borra solicitudes.
- **Archivos:** buckets `media` (imágenes) y `documentos` (PDF), escritura solo del personal.
- **Agente de IA:** `conversaciones`, `mensajes`, `propuestas`, `aprendizaje`, `videos`, solo personal.
