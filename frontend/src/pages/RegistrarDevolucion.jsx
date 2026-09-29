// ======================================================
// IMPORTACIONES
// ======================================================

import { useEffect, useState } from 'react'

// ======================================================
// COMPONENTES Y DATOS AUXILIARES
// ======================================================

const Icono = ({ tipo }) => {
  const trazos = {
    inicio: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    equipos: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>,
    empleados: <><circle cx="9" cy="7" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2m1-15a3 3 0 0 1 0 6m2 2a5 5 0 0 1 3 5v2" /></>,
    asignaciones: <><path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4" /></>,
    devoluciones: <><path d="M4 7v6h6" /><path d="M5.5 13a8 8 0 1 0 2-7" /></>,
    historial: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" /></>,
    administradores: <><path d="M12 2 20 5v6c0 5-3.3 9-8 11-4.7-2-8-6-8-11V5l8-3Z" /><circle cx="12" cy="9" r="2.5" /><path d="M8 16a4 4 0 0 1 8 0" /></>,
    salir: <><path d="M14 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-3m-4-4h11m-4-4 4 4-4 4" /></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{trazos[tipo]}</svg>
}

const opciones = [
  ['inicio', 'Inicio'], ['equipos', 'Equipos'], ['empleados', 'Empleados'],
  ['asignaciones', 'Asignaciones'], ['devoluciones', 'Devoluciones'],
  ['historial', 'Historial'], ['administradores', 'Administradores'],
]
const condiciones = ['Buen estado', 'Con daños', 'Requiere reparación']
const formularioInicial = { idAsignacion: '', fechaDevolucion: '', condicionDevolucion: '', observaciones: '' }

function obtenerUsuario() {
  try { return JSON.parse(localStorage.getItem('usuario')) || {} } catch { return {} }
}

// Convierte la fecha recibida del backend al formato YYYY-MM-DD del input date.
function fechaLocal(valor) {
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return ''
  const desplazamiento = fecha.getTimezoneOffset() * 60000
  return new Date(fecha.getTime() - desplazamiento).toISOString().slice(0, 10)
}

function RegistrarDevolucion({ onInicio, onLogout }) {
  const usuario = obtenerUsuario()
  const [asignaciones, setAsignaciones] = useState([])
  const [formulario, setFormulario] = useState(formularioInicial)
  const [errores, setErrores] = useState({})
  const [cargandoAsignaciones, setCargandoAsignaciones] = useState(true)
  const [errorAsignaciones, setErrorAsignaciones] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensajeDevolucion, setMensajeDevolucion] = useState(null)

  const hoy = (() => {
    const fecha = new Date()
    const desplazamiento = fecha.getTimezoneOffset() * 60000
    return new Date(fecha.getTime() - desplazamiento).toISOString().slice(0, 10)
  })()

  const asignacionSeleccionada = asignaciones.find(
    (asignacion) => String(asignacion.id_asignacion) === formulario.idAsignacion,
  )
  const fechaMinima = asignacionSeleccionada ? fechaLocal(asignacionSeleccionada.fecha_asignacion) : ''

  // Carga únicamente las asignaciones que todavía no tienen devolución.
  useEffect(() => {
    const controlador = new AbortController()
    const cargarAsignaciones = async () => {
      try {
        const respuesta = await fetch('http://localhost:3000/api/asignaciones?estado=activa', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          signal: controlador.signal,
        })
        if (respuesta.status === 401 || respuesta.status === 403) {
          setErrorAsignaciones('La sesión expiró. Inicia sesión nuevamente.')
          return
        }
        if (!respuesta.ok) {
          setErrorAsignaciones('No se pudieron cargar las asignaciones activas.')
          return
        }
        setAsignaciones(await respuesta.json())
        setErrorAsignaciones('')
      } catch (error) {
        if (error.name !== 'AbortError') setErrorAsignaciones('No se pudo conectar con el servidor.')
      } finally {
        if (!controlador.signal.aborted) setCargandoAsignaciones(false)
      }
    }
    cargarAsignaciones()
    return () => controlador.abort()
  }, [])

  const validarCampo = (nombre, valor, datos = formulario) => {
    if (nombre === 'idAsignacion' && !asignaciones.some((asignacion) => String(asignacion.id_asignacion) === valor)) return 'Selecciona una asignación activa.'
    if (nombre === 'fechaDevolucion' && !valor) return 'Selecciona una fecha de devolución.'
    if (nombre === 'fechaDevolucion' && valor > hoy) return 'La fecha de devolución no puede ser futura.'
    if (nombre === 'fechaDevolucion' && valor) {
      const seleccionada = asignaciones.find((asignacion) => String(asignacion.id_asignacion) === datos.idAsignacion)
      if (seleccionada && valor < fechaLocal(seleccionada.fecha_asignacion)) return 'La fecha de devolución no puede ser anterior a la fecha de asignación.'
    }
    if (nombre === 'condicionDevolucion' && !condiciones.includes(valor)) return 'Selecciona una condición de devolución.'
    return ''
  }

  const cambiarCampo = (event) => {
    const { name, value } = event.target
    const siguientesDatos = { ...formulario, [name]: value }
    setFormulario(siguientesDatos)
    setMensajeDevolucion(null)

    setErrores((actuales) => {
      const siguientes = { ...actuales }
      if (actuales[name]) {
        const error = validarCampo(name, value, siguientesDatos)
        if (error) siguientes[name] = error
        else delete siguientes[name]
      }
      // Cambiar la asignación también puede cambiar la validez de la fecha ya escrita.
      if (name === 'idAsignacion' && actuales.fechaDevolucion) {
        const errorFecha = validarCampo('fechaDevolucion', siguientesDatos.fechaDevolucion, siguientesDatos)
        if (errorFecha) siguientes.fechaDevolucion = errorFecha
        else delete siguientes.fechaDevolucion
      }
      return siguientes
    })
  }

  const validarFormulario = (datos) => {
    const nuevosErrores = {}
    ;['idAsignacion', 'fechaDevolucion', 'condicionDevolucion'].forEach((nombre) => {
      const error = validarCampo(nombre, datos[nombre], datos)
      if (error) nuevosErrores[nombre] = error
    })
    return nuevosErrores
  }

  const registrarDevolucion = async (event) => {
    event.preventDefault()
    if (enviando) return

    const datos = { ...formulario, observaciones: formulario.observaciones.trim() }
    const nuevosErrores = validarFormulario(datos)
    setFormulario(datos)
    setErrores(nuevosErrores)
    setMensajeDevolucion(null)

    const primerCampoInvalido = Object.keys(nuevosErrores)[0]
    if (primerCampoInvalido) {
      requestAnimationFrame(() => document.querySelector(`[name="${primerCampoInvalido}"]`)?.focus())
      return
    }

    setEnviando(true)
    try {
      const respuesta = await fetch('http://localhost:3000/api/devoluciones', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_asignacion: Number(datos.idAsignacion),
          fecha_devolucion: datos.fechaDevolucion,
          condicion_devolucion: datos.condicionDevolucion,
          observaciones: datos.observaciones || null,
        }),
      })
      const data = await respuesta.json()

      if (respuesta.status === 201) {
        setAsignaciones((actuales) => actuales.filter((asignacion) => String(asignacion.id_asignacion) !== datos.idAsignacion))
        setFormulario(formularioInicial)
        setErrores({})
        setMensajeDevolucion({ tipo: 'exito', texto: 'Devolución registrada correctamente.' })
      } else if (respuesta.status === 401 || respuesta.status === 403) {
        setMensajeDevolucion({ tipo: 'error', texto: 'La sesión expiró. Inicia sesión nuevamente.' })
      } else {
        // Conserva los mensajes específicos del backend para asignación, equipo, fecha y condición.
        setMensajeDevolucion({ tipo: 'error', texto: data.mensaje || 'No fue posible registrar la devolución.' })
      }
    } catch {
      setMensajeDevolucion({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' })
    } finally {
      setEnviando(false)
    }
  }

  const cerrarSesion = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    onLogout()
  }
  const claseCampo = (nombre) => errores[nombre] ? 'field-control--error' : ''
  const sinAsignaciones = !cargandoAsignaciones && !errorAsignaciones && asignaciones.length === 0

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="sidebar-logo"><Icono tipo="equipos" /></div><div><strong>Inventario TI</strong><p>Sistema de gestión de equipos de tecnología</p></div></div>
        <nav className="sidebar-nav" aria-label="Navegación principal">
          {opciones.map(([icono, texto]) => <button className={texto === 'Devoluciones' ? 'active' : ''} type="button" key={texto} onClick={texto === 'Inicio' ? onInicio : undefined}><Icono tipo={icono} /><span>{texto}</span>{texto !== 'Inicio' && <span className="nav-arrow">›</span>}</button>)}
        </nav>
        <div className="sidebar-account">
          <div className="account-info"><span className="account-avatar"><Icono tipo="administradores" /></span><div><strong>{usuario.nombre || 'Administrador'}</strong><small>{usuario.correo || ''}</small></div></div>
          <button className="logout-button" type="button" onClick={cerrarSesion}><Icono tipo="salir" />Cerrar sesión</button>
        </div>
      </aside>

      <main className="dashboard-main equipment-page">
        <section className="equipment-form-card" aria-labelledby="return-form-title">
          <header className="equipment-form-header"><h1 id="return-form-title">Registrar devolución</h1></header>
          <form className="equipment-form" onSubmit={registrarDevolucion} noValidate>
            <div className="equipment-field equipment-field--full">
              <label htmlFor="asignacion-devolucion">Asignación <span>*</span></label>
              <select id="asignacion-devolucion" name="idAsignacion" value={formulario.idAsignacion} onChange={cambiarCampo} disabled={cargandoAsignaciones || sinAsignaciones} className={claseCampo('idAsignacion')} aria-invalid={Boolean(errores.idAsignacion)}>
                <option value="" disabled>{cargandoAsignaciones ? 'Cargando asignaciones...' : 'Selecciona una asignación'}</option>
                {asignaciones.map((asignacion) => <option value={asignacion.id_asignacion} key={asignacion.id_asignacion}>{`${asignacion.equipo.codigo_interno} - ${asignacion.equipo.nombre} - ${asignacion.empleado.nombres} ${asignacion.empleado.apellidos}`}</option>)}
              </select>
              {errores.idAsignacion && <small className="field-error">{errores.idAsignacion}</small>}
            </div>
            <div className="equipment-field">
              <label htmlFor="fecha-devolucion">Fecha de devolución <span>*</span></label>
              <input id="fecha-devolucion" name="fechaDevolucion" type="date" min={fechaMinima || undefined} max={hoy} value={formulario.fechaDevolucion} onChange={cambiarCampo} className={claseCampo('fechaDevolucion')} aria-invalid={Boolean(errores.fechaDevolucion)} />
              {errores.fechaDevolucion && <small className="field-error">{errores.fechaDevolucion}</small>}
            </div>
            <div className="equipment-field">
              <label htmlFor="condicion-devolucion">Condición <span>*</span></label>
              <select id="condicion-devolucion" name="condicionDevolucion" value={formulario.condicionDevolucion} onChange={cambiarCampo} className={claseCampo('condicionDevolucion')} aria-invalid={Boolean(errores.condicionDevolucion)}>
                <option value="" disabled>Selecciona una condición</option>
                {condiciones.map((condicion) => <option value={condicion} key={condicion}>{condicion}</option>)}
              </select>
              {errores.condicionDevolucion && <small className="field-error">{errores.condicionDevolucion}</small>}
            </div>
            <div className="equipment-field equipment-field--full">
              <label htmlFor="observaciones-devolucion">Observaciones</label>
              <textarea id="observaciones-devolucion" name="observaciones" rows="4" value={formulario.observaciones} onChange={cambiarCampo} />
            </div>

            {errorAsignaciones && <p className="catalog-error equipment-field--full" role="alert">{errorAsignaciones}</p>}
            {sinAsignaciones && <p className="catalog-error equipment-field--full" role="status">No hay asignaciones activas disponibles para devolver.</p>}
            {mensajeDevolucion && <p className={`form-submit-message form-submit-message--${mensajeDevolucion.tipo} equipment-field--full`} role={mensajeDevolucion.tipo === 'error' ? 'alert' : 'status'}>{mensajeDevolucion.texto}</p>}
            <div className="equipment-actions equipment-field--full">
              <button className="secondary-button" type="button" onClick={onInicio}>Cancelar</button>
              <button className="primary-button" type="submit" disabled={enviando || cargandoAsignaciones || sinAsignaciones}>{enviando ? 'Registrando devolución...' : 'Registrar devolución'}</button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}

export default RegistrarDevolucion
