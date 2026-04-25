# ─────────────────────────────────────────────────────────
# Stage 1: deps
# Instala solo las dependencias de producción.
# python3/make/g++ son necesarios para compilar módulos
# nativos de npm (ej: drivers de MySQL). Se descartan al
# terminar — nunca llegan a la imagen final.
# ─────────────────────────────────────────────────────────
FROM node:22-slim AS deps

WORKDIR /app

COPY package*.json ./

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && npm ci --omit=dev \
    && rm -rf /var/lib/apt/lists/*


# ─────────────────────────────────────────────────────────
# Stage 2: builder
# Instala todas las deps (incluyendo typescript) y compila
# el código fuente TypeScript a JavaScript en dist/.
# ─────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# ─────────────────────────────────────────────────────────
# Stage 3: deploy — distroless
# Sin shell, sin package manager, sin usuario root.
# Solo Node.js + el código compilado + node_modules de prod.
# Superficie de ataque mínima.
# ─────────────────────────────────────────────────────────
FROM gcr.io/distroless/nodejs22-debian12 AS deploy

WORKDIR /app

# nonroot (uid 65532) viene incluido en la imagen distroless
USER nonroot

COPY --from=deps    --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/dist         ./dist
COPY --from=builder --chown=nonroot:nonroot /app/assets       ./assets

ENV PORT=3008
EXPOSE 3008

# distroless/nodejs22 tiene ENTRYPOINT ["node"] built-in
# así que CMD recibe directamente el archivo a ejecutar
CMD ["dist/app.js"]
