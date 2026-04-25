import { createFlow } from '@builderbot/bot'
import { welcomeFlow } from './common/welcome.flow'
import { flujoConfirmacionDatos, flujoReingresoDatos } from './common/confirmation.flow'
import { flujoSeleccionEmpresa } from './common/company-selection.flow'
import { motivoContactoFlow, requerimientoFlow } from './common/motivo.flow'
import { asesoriaFlow } from './common/asesoria.flow'
import { incidenteFlow } from './safi/incident.flow'
import { desbloquearUsuarioFlow } from './safi/req-unlock.flow'
import { noPuedoOperarFlow } from './safi/req-no-operar.flow'
import { cambioPasswordImeiFlow } from './safi/req-password.flow'
import { limpiarIMEIFlow } from './safi/req-imei.flow'
import { nuevoEmpleadoFlow } from './safi/req-employee.flow'
import { otroRequerimientoFlow } from './safi/req-other.flow'
import { requerimientoSafiFlow } from './safi/index'
import { novaholdIncidenteFlow } from './novahold/incident.flow'
import { novaholdReqCambioPassFlow } from './novahold/req-password.flow'
import { novaholdReqEquiposFlow } from './novahold/req-equipment.flow'
import { novaholdReqOtroFlow } from './novahold/req-other.flow'
import { requerimientoNovaholdFlow } from './novahold/index'

export const adapterFlow = createFlow([
  welcomeFlow,
  flujoConfirmacionDatos,
  flujoReingresoDatos,
  flujoSeleccionEmpresa,
  motivoContactoFlow,
  requerimientoFlow,
  asesoriaFlow,
  incidenteFlow,
  desbloquearUsuarioFlow,
  noPuedoOperarFlow,
  cambioPasswordImeiFlow,
  limpiarIMEIFlow,
  nuevoEmpleadoFlow,
  otroRequerimientoFlow,
  requerimientoSafiFlow,
  novaholdIncidenteFlow,
  novaholdReqCambioPassFlow,
  novaholdReqEquiposFlow,
  novaholdReqOtroFlow,
  requerimientoNovaholdFlow,
])
