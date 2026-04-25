# NovaDesk Bot

Bot de WhatsApp de mesa de ayuda (help desk) para **SAFI** y **NOVAHOLD**. Gestiona incidentes, requerimientos y asesorías vía conversación, y envía notificaciones por email al equipo de soporte.

---

## Stack

| Tecnología | Versión | Rol |
|---|---|---|
| Node.js | v22 | Runtime |
| TypeScript | 5.8 | Lenguaje |
| @builderbot/bot | 1.4.1 | Framework de flujos de conversación |
| @builderbot/provider-meta | 1.4.1 | Provider WhatsApp Business (Meta) |
| @builderbot/database-mysql | 1.4.1 | Persistencia de sesiones |
| nodemailer | 6.9 | Envío de notificaciones (Office365 SMTP) |
| vitest | 1.x | Testing |
| Docker Compose | — | MySQL local para desarrollo |

---

## Arquitectura

```
src/
├── app.ts                          # Bootstrap: createBot + httpServer
├── provider.ts                     # MetaProvider con webhook challenge handler
├── database.ts                     # MysqlAdapter (sesiones persistentes)
├── config.ts                       # Variables de entorno + validaciones
│
├── flows/
│   ├── index.ts                    # Barrel: createFlow([...todos los flujos])
│   ├── common/
│   │   ├── welcome.flow.ts         # Saludo + captura de nombre/email
│   │   ├── confirmation.flow.ts    # Confirmación y reingreso de datos
│   │   ├── company-selection.flow.ts  # Selección SAFI / NOVAHOLD
│   │   ├── motivo.flow.ts          # Router: incidente / requerimiento / asesoría
│   │   └── asesoria.flow.ts        # Derivación a WhatsApp de soporte
│   ├── safi/
│   │   ├── incident.flow.ts        # Router de incidentes SAFI
│   │   ├── req-unlock.flow.ts      # Desbloquear usuario
│   │   ├── req-no-operar.flow.ts   # No puedo operar
│   │   ├── req-password.flow.ts    # Cambio de contraseña / IMEI
│   │   ├── req-imei.flow.ts        # Limpiar IMEI
│   │   ├── req-employee.flow.ts    # Crear nuevo empleado
│   │   ├── req-other.flow.ts       # Otro requerimiento
│   │   └── index.ts                # Router de requerimientos SAFI
│   └── novahold/
│       ├── incident.flow.ts        # Incidente Novahold
│       ├── req-password.flow.ts    # Cambio de contraseña correo
│       ├── req-equipment.flow.ts   # Solicitud de equipos
│       ├── req-other.flow.ts       # Otro requerimiento
│       └── index.ts                # Router de requerimientos Novahold
│
├── services/
│   ├── email.service.ts            # sendEmail() con reintentos exponenciales
│   └── session.service.ts          # Estado de sesión, timeouts, validaciones
│
└── utils/
    ├── validators.ts               # validarEmail, validarNombre, extraerDatosUsuario
    ├── sanitizers.ts               # sanitizeForEmail, sanitizeInput, dividirMensaje
    └── logger.ts                   # BotLogger (INFO / ERROR / SUCCESS / WARNING)
```

### Principio de diseño

Cada empresa tiene su propia carpeta de flujos (`safi/`, `novahold/`). Agregar una tercera empresa es crear una carpeta nueva sin tocar nada existente. Los flujos comparten lógica a través de `services/` y `utils/` — nunca importándose entre sí directamente.

---

## Flujo de conversación

```
Usuario escribe "hola"
        │
        ▼
[welcome] Solicita nombre + email
        │ validación + sanitización
        ▼
[confirmation] ¿Los datos son correctos?
        │ sí → continúa  │  no → reingreso
        ▼
[company-selection] ¿SAFI o NOVAHOLD?
        │
        ▼
[motivo] ¿Incidente / Requerimiento / Asesoría?
        │
        ├── Incidente ──────► safi/incident  o  novahold/incident
        │                         │
        │                         ▼ sub-flujo específico
        │                         │
        ├── Requerimiento ──► safi/index  o  novahold/index
        │                         │
        │                         ▼ sub-flujo específico
        │
        └── Asesoría ──────► asesoria (deriva a WhatsApp humano)
                │
                ▼ (todos los sub-flujos terminan aquí)
        finalizarConMenu()
        ├── Arma resumen con los datos capturados
        ├── Envía email al equipo de soporte
        └── Ofrece volver al menú o finalizar
```

---

## Variables de entorno

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# META / WHATSAPP BUSINESS API
META_ACCESS_TOKEN=        # Token permanente de la app en Meta for Developers
META_NUMBER_ID=           # ID del número de teléfono registrado
META_VERIFY_TOKEN=        # Token personalizado para verificar el webhook
META_VERSION=v18.0        # Versión de la Graph API

# SERVIDOR
PORT=3008                 # Puerto del servidor HTTP (default: 3008)

# EMAIL (Office365 SMTP)
EMAIL_USER=               # Cuenta desde la que se envían los correos
EMAIL_PASS=               # Contraseña de aplicación (no la contraseña personal)
EMAIL_TO=                 # Destinatario de las notificaciones de soporte

# MYSQL
MYSQL_DB_HOST=localhost
MYSQL_DB_PORT=3306
MYSQL_DB_USER=novadesk
MYSQL_DB_PASSWORD=novadesk_pass
MYSQL_DB_NAME=novadesk_db
```

> **Nota**: `EMAIL_PASS` debe ser una contraseña de aplicación de Office365, no la contraseña de la cuenta. Se genera en la configuración de seguridad de Microsoft 365.

---

## Setup local

### Requisitos
- Node.js v22+
- Docker y Docker Compose

### Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el .env con tus variables (ver sección anterior)

# 3. Levantar MySQL
docker compose up -d

# 4. Verificar que MySQL está healthy
docker compose ps

# 5. Arrancar el bot
npm run dev
```

El `MysqlAdapter` crea la tabla de sesiones automáticamente en el primer arranque. No es necesario correr SQL manualmente.

---

## Persistencia de sesiones

El bot usa `@builderbot/database-mysql` para persistir el estado de cada conversación. Esto significa que si el proceso se reinicia mientras un usuario está en medio de un flujo, el estado no se pierde.

La tabla se llama `history` y es gestionada internamente por el adapter — no necesitás interactuar con ella directamente.

---

## Seguridad

- **Sanitización**: todos los inputs del usuario pasan por `sanitizeInput()` antes de guardarse en el state, y por `sanitizeForEmail()` antes de incluirse en un email. Previene XSS e inyección HTML.
- **Validación de email**: regex + reglas adicionales (longitud máxima, puntos dobles, inicio/fin con punto).
- **Verificación de webhook**: el `MetaProvider` valida el `hub.verify_token` contra la variable de entorno antes de confirmar el challenge de Meta.
- **TLS**: la conexión SMTP usa `TLSv1.2` con `rejectUnauthorized: true`.
- **Timeout de sesión**: las sesiones inactivas por más de 15 minutos se resetean automáticamente.

---

## Testing

```bash
# Correr tests
npm test

# Watch mode
npm run test:watch

# Con cobertura
npm run test:coverage
```

Los tests cubren las funciones puras de `utils/`:

| Archivo | Tests | Cobertura |
|---|---|---|
| `validators.test.ts` | 18 | validarEmail, validarNombre, extraerDatosUsuario |
| `sanitizers.test.ts` | 14 | sanitizeForEmail, sanitizeInput, dividirMensaje |

### Simulación de conversaciones (sin WhatsApp)

El archivo `test-webhook.sh` simula mensajes de WhatsApp enviando payloads directamente al endpoint del bot. No requiere ngrok ni cuenta de Meta.

```bash
# Con el bot corriendo en otra terminal
npm run dev

# Ejecutar el simulador
./test-webhook.sh
```

Aparece un menú interactivo con 11 escenarios:

| # | Escenario |
|---|---|
| 1 | SAFI — Incidente |
| 2 | SAFI — Requerimiento: Cambio de contraseña |
| 3 | SAFI — Requerimiento: Limpiar IMEI |
| 4 | SAFI — Requerimiento: Nuevo empleado |
| 5 | SAFI — Requerimiento: Otro |
| 6 | NOVAHOLD — Incidente |
| 7 | NOVAHOLD — Requerimiento: Contraseña correo |
| 8 | NOVAHOLD — Requerimiento: Solicitud de equipos |
| 9 | NOVAHOLD — Asesoría |
| 10 | Corrección de datos (flujo de reingreso) |
| 11 | Email inválido (validación de entrada) |

Las respuestas del bot se ven en la consola donde corre `npm run dev`.

---

## Configuración del webhook (Meta)

1. En [Meta for Developers](https://developers.facebook.com/), configurar la URL del webhook: `https://tu-dominio.com/webhook`
2. El método `GET` del webhook valida el token con `META_VERIFY_TOKEN`
3. El método `POST` recibe los mensajes entrantes de WhatsApp

Para desarrollo local, usar un tunnel como **ngrok**:

```bash
ngrok http 3008
# Copiar la URL HTTPS y usarla como webhook URL en Meta
```

---

## Agregar una nueva empresa

1. Crear carpeta `src/flows/nueva-empresa/`
2. Agregar los flujos necesarios siguiendo el mismo patrón de SAFI o NOVAHOLD
3. Agregar la empresa a la constante `EMPRESAS` en `company-selection.flow.ts`
4. Registrar los flujos nuevos en el barrel `src/flows/index.ts`
5. Agregar el routing en `motivo.flow.ts` según el nombre de empresa

---

## Scripts disponibles

| Script | Comando | Descripción |
|---|---|---|
| `dev` | `ts-node ./src/app.ts` | Desarrollo con ts-node |
| `start` | `node dist/app.js` | Producción (requiere build previo) |
| `test` | `vitest run` | Tests una vez |
| `test:watch` | `vitest watch` | Tests en modo watch |
| `test:coverage` | `vitest run --coverage` | Tests con reporte de cobertura |
