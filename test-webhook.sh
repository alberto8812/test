#!/bin/bash
# test-webhook.sh
# Simulación de mensajes WhatsApp para NovaDesk Bot
# Uso: ./test-webhook.sh

BASE_URL="http://localhost:3008"
PHONE="5491112345678"
DELAY=1.5  # segundos entre mensajes (el bot necesita tiempo para procesar)

# ─────────────────────────────────────────────
# Función base: envía un mensaje al webhook
# ─────────────────────────────────────────────
send() {
  local body="$1"
  local label="$2"

  echo ""
  echo "📤  [$label] → \"$body\""

  curl -s -X POST "$BASE_URL/webhook" \
    -H "Content-Type: application/json" \
    -d "{
      \"object\": \"whatsapp_business_account\",
      \"entry\": [{
        \"changes\": [{
          \"field\": \"messages\",
          \"value\": {
            \"messaging_product\": \"whatsapp\",
            \"contacts\": [{
              \"profile\": { \"name\": \"Test User\" },
              \"wa_id\": \"$PHONE\"
            }],
            \"messages\": [{
              \"from\": \"$PHONE\",
              \"id\": \"msg_$(date +%s%N)\",
              \"timestamp\": \"$(date +%s)\",
              \"type\": \"text\",
              \"text\": { \"body\": \"$body\" }
            }]
          }
        }]
      }]
    }" > /dev/null

  sleep "$DELAY"
}

# ─────────────────────────────────────────────
# Menú de selección
# ─────────────────────────────────────────────
echo "╔══════════════════════════════════════════╗"
echo "║   NovaDesk — Simulador de WhatsApp       ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  1) SAFI — Incidente"
echo "  2) SAFI — Requerimiento: Cambio de contraseña"
echo "  3) SAFI — Requerimiento: Limpiar IMEI"
echo "  4) SAFI — Requerimiento: Nuevo empleado"
echo "  5) SAFI — Requerimiento: Otro"
echo "  6) NOVAHOLD — Incidente"
echo "  7) NOVAHOLD — Requerimiento: Contraseña correo"
echo "  8) NOVAHOLD — Requerimiento: Solicitud de equipos"
echo "  9) NOVAHOLD — Asesoría"
echo " 10) Corrección de datos (reingresar email)"
echo " 11) Email inválido (validación de entrada)"
echo ""
read -rp "Seleccioná un escenario [1-11]: " SCENARIO
echo ""

# ─────────────────────────────────────────────
# Paso común: inicio de conversación
# (todos los escenarios arrancan igual)
# ─────────────────────────────────────────────
inicio_comun() {
  local empresa="$1"   # "safi" o "novahold"
  local motivo="$2"    # "incidente", "requerimiento" o "asesoría"

  send "hola"                                "1. Saludo → welcomeFlow"
  send "Carlos Velasco, carlos@empresa.com"  "2. Nombre + email"
  send "1"                                   "3. Confirmar datos (1=sí)"
  send "$empresa"                            "4. Seleccionar empresa"
  send "$motivo"                             "5. Tipo de contacto"
}

# ─────────────────────────────────────────────
# Escenarios
# ─────────────────────────────────────────────

case "$SCENARIO" in

  1)
    echo "▶  SAFI — Incidente"
    inicio_comun "safi" "incidente"
    send "No puedo ingresar al sistema desde esta mañana"  "6. Descripción del incidente"
    send "1"                                               "7. Confirmar envío y volver al menú"
    ;;

  2)
    echo "▶  SAFI — Requerimiento: Cambio de contraseña"
    inicio_comun "safi" "requerimiento"
    send "1"                              "6. Seleccionar: Cambio de contraseña"
    send "usuario.prueba"                 "7. Nombre de usuario a resetear"
    send "1"                              "8. Confirmar y volver al menú"
    ;;

  3)
    echo "▶  SAFI — Requerimiento: Limpiar IMEI"
    inicio_comun "safi" "requerimiento"
    send "2"                              "6. Seleccionar: Limpiar IMEI"
    send "358240051111110"                "7. IMEI del dispositivo"
    send "1"                              "8. Confirmar y volver al menú"
    ;;

  4)
    echo "▶  SAFI — Requerimiento: Nuevo empleado"
    inicio_comun "safi" "requerimiento"
    send "3"                                         "6. Seleccionar: Crear nuevo empleado"
    send "Ana Gómez, Legajo 4521, Área Finanzas"     "7. Datos del nuevo empleado"
    send "1"                                         "8. Confirmar y volver al menú"
    ;;

  5)
    echo "▶  SAFI — Requerimiento: Otro"
    inicio_comun "safi" "requerimiento"
    send "4"                                          "6. Seleccionar: Otro"
    send "Necesito acceso al módulo de reportes"      "7. Descripción del requerimiento"
    send "1"                                          "8. Confirmar y volver al menú"
    ;;

  6)
    echo "▶  NOVAHOLD — Incidente"
    inicio_comun "novahold" "incidente"
    send "La impresora de red no responde desde ayer" "6. Descripción del incidente"
    send "1"                                          "7. Confirmar y volver al menú"
    ;;

  7)
    echo "▶  NOVAHOLD — Requerimiento: Contraseña correo"
    inicio_comun "novahold" "requerimiento"
    send "1"                              "6. Seleccionar: Cambio de contraseña correo"
    send "ana.gomez@novahold.com"         "7. Correo a resetear"
    send "1"                              "8. Confirmar y volver al menú"
    ;;

  8)
    echo "▶  NOVAHOLD — Requerimiento: Solicitud de equipos"
    inicio_comun "novahold" "requerimiento"
    send "2"                                          "6. Seleccionar: Solicitud de equipos"
    send "1 notebook HP para el área de ventas"       "7. Descripción del equipo requerido"
    send "1"                                          "8. Confirmar y volver al menú"
    ;;

  9)
    echo "▶  NOVAHOLD — Asesoría"
    inicio_comun "novahold" "asesoría"
    # El flujo de asesoría deriva a un WhatsApp humano, sin más pasos
    ;;

  10)
    echo "▶  Corrección de datos (el usuario dice que sus datos están mal)"
    send "hola"                                          "1. Saludo → welcomeFlow"
    send "Carlos Velasco, carlos.mal@empresa"            "2. Email con dominio incompleto"
    send "2"                                             "3. No confirmar datos (2=no)"
    send "Carlos Velasco, carlos.correcto@empresa.com"   "4. Reingresar datos correctos"
    send "1"                                             "5. Confirmar datos"
    send "safi"                                          "6. Seleccionar empresa"
    send "incidente"                                     "7. Tipo de contacto"
    send "Error al intentar exportar un reporte"         "8. Descripción del incidente"
    send "1"                                             "9. Confirmar y volver al menú"
    ;;

  11)
    echo "▶  Validación: email inválido (el bot debe pedir reingreso)"
    send "hola"                               "1. Saludo → welcomeFlow"
    send "Carlos Velasco, esto-no-es-email"   "2. Email completamente inválido"
    # El bot debería detectar el error y pedir los datos de nuevo
    send "Carlos Velasco, carlos@empresa.com" "3. Datos corregidos"
    send "1"                                  "4. Confirmar"
    ;;

  *)
    echo "❌ Opción inválida. Ejecutá el script de nuevo."
    exit 1
    ;;
esac

echo ""
echo "✅ Escenario completado. Revisá la consola del bot para ver las respuestas."
