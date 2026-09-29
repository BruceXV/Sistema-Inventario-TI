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
const formularioInicial = { idEmpleado: '', idEquipo: '', fechaAsignacion: '', observaciones: '' }

function obtenerUsuario() {
  try { return JSON.parse(localStorage.getItem('usuario')) || {} } catch { return {} }
}

// ======================================================
// COMPONENTE ASIGNAR EQUIPO
// ======================================================

function AsignarEquipo({ onInicio, onLogout }) {
  const usuario = obtenerUsuario()
  const [empleados, setEmpleados] = useState([])
  const [equiposDisponibles, setEquiposDisponibles] = useState([])
  const [formulario, setFormulario] = useState(formularioInicial)
  const [errores, setErrores] = useState({})
  const [cargandoDatos, setCargandoDatos] = useState(true)
  const [errorDatos, setErrorDatos] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensajeAsignacion, setMensajeAsignacion] = useState(null)

  const hoy = (() => {
    const fecha = new Date()
    const desplazamiento = fecha.getTimezoneOffset() * 60000
    return new Date(fecha.getTime() - desplazamiento).toISOString().slice(0, 10)
  })()

  // Carga empleados activos y equipos en paralelo al abrir la pantalla.
  useEffect(() => {
    const controlador = new AbortController()

    const cargarDatos = async () => {
      const token = localStorage.getItem('token')
      try {
        const [respuestaEmpleados, respuestaEquipos] = await Promise.all([
          fetch('http://localhost:3000/api/empleados?estado=activo', {
            headers: { Authorization: `Bearer ${token}` }, signal: controlador.signal,
          }),
          fetch('http://localhost:3000/api/equipos', {
            headers: { Authorization: `Bearer ${token}` }, signal: controlador.signal,
          }),
        ])

        if ([respuestaEmpleados.status, respuestaEquipos.status].some((estado) => estado === 401 || estado === 403)) {
          setErrorDatos('La sesión expiró. Inicia sesión nuevamente.')
          return
        }
        if (!respuestaEmpleados.ok || !respuestaEquipos.ok) {
          setErrorDatos('No se pudieron cargar los datos de la asignación.')
          return
        }

        const [datosEmpleados, datosEquipos] = await Promise.all([
          respuestaEmpleados.json(), respuestaEquipos.json(),
        ])
        setEmpleados(datosEmpleados.filter((empleado) => empleado.estado === true))
        setEquiposDisponibles(datosEquipos.filter((equipo) => Number(equipo.id_estado) === 1))
        setErrorDatos('')
      } catch (error) {
        if (error.name !== 'AbortError') setErrorDatos('No se pudo conectar con el servidor.')
      } finally {
        if (!controlador.signal.aborted) setCargandoDatos(false)
      }
    }

    cargarDatos()
    return () => controlador.abort()
  }, [])

  const cambiarCampo = (event) => {
    const { name, value } = event.target
    setFormulario((actual) => ({ ...actual, [name]: value }))
    setMensajeAsignacion(null)

    if (errores[name]) {
      setErrores((actuales) => {
        const siguientes = { ...actuales }
        const errorActualizado = validarCampo(name, value)
        if (errorActualizado) siguientes[name] = errorActualizado
        else delete siguientes[name]
        return siguientes
      })
    }
  }

  // Valida cada control para retirar su error solamente cuando el dato ya sea correcto.
  const validarCampo = (nombre, valor) => {
    if (nombre === 'idEmpleado' && !empleados.some((empleado) => String(empleado.id_empleado) === valor)) return 'Selecciona un empleado.'
    if (nombre === 'idEquipo' && !equiposDisponibles.some((equipo) => String(equipo.id_equipo) === valor)) return 'Selecciona un equipo disponible.'
    if (nombre === 'fechaAsignacion' && !valor) return 'Selecciona una fecha de asignación.'
    if (nombre === 'fechaAsignacion' && valor > hoy) return 'La fecha de asignación no puede ser futura.'
    if (nombre === 'observaciones' && !valor.trim()) return 'Ingresa una observación para la asignación.'
    return ''
  }

  const validarFormulario = (datos) => {
    const nuevosErrores = {}
    Object.keys(formularioInicial).forEach((nombre) => {
      const error = validarCampo(nombre, datos[nombre])
      if (error) nuevosErrores[nombre] = error
    })
    return nuevosErrores
  }

  // Valida y registra la asignación mediante la ruta protegida del backend.
  const asignarEquipo = async (event) => {
    event.preventDefault()
    if (enviando) return

    const datos = {
      ...formulario,
      observaciones: formulario.observaciones.trim(),
    }
    const nuevosErrores = validarFormulario(datos)
    setFormulario(datos)
    setErrores(nuevosErrores)
    setMensajeAsignacion(null)

    const primerCampoInvalido = Object.keys(nuevosErrores)[0]
    if (primerCampoInvalido) {
      requestAnimationFrame(() => document.querySelector(`[name="${primerCampoInvalido}"]`)?.focus())
      return
    }

    setEnviando(true)
    try {
      const respuesta = await fetch('http://localhost:3000/api/asignaciones', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_equipo: Number(datos.idEquipo),
          id_empleado: Number(datos.idEmpleado),
          fecha_asignacion: datos.fechaAsignacion,
          observaciones: datos.observaciones,
        }),
      })
      const data = await respuesta.json()

      if (respuesta.status === 201) {
        setEquiposDisponibles((actuales) => actuales.filter((equipo) => String(equipo.id_equipo) !== datos.idEquipo))
        setFormulario(formularioInicial)
        setErrores({})
        setMensajeAsignacion({ tipo: 'exito', texto: 'Equipo asignado correctamente' })
      } else if (respuesta.status === 401 || respuesta.status === 403) {
        setMensajeAsignacion({ tipo: 'error', texto: 'La sesión expiró. Inicia sesión nuevamente.' })
      } else {
        // El backend entrega mensajes específicos para equipo/empleado inexistente, no disponible, inactivo o fecha inválida.
        setMensajeAsignacion({ tipo: 'error', texto: data.mensaje || 'No fue posible asignar el equipo.' })
      }
    } catch {
      setMensajeAsignacion({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' })
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

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="sidebar-logo"><Icono tipo="equipos" /></div><div><strong>Inventario TI</strong><p>Sistema de gestión de equipos de tecnología</p></div></div>
        <nav className="sidebar-nav" aria-label="Navegación principal">
          {opciones.map(([icono, texto]) => <button className={texto === 'Asignaciones' ? 'active' : ''} type="button" key={texto} onClick={texto === 'Inicio' ? onInicio : undefined}><Icono tipo={icono} /><span>{texto}</span>{texto !== 'Inicio' && <span className="nav-arrow">›</span>}</button>)}
        </nav>
        <div className="sidebar-account">
          <div className="account-info"><span className="account-avatar"><Icono tipo="administradores" /></span><div><strong>{usuario.nombre || 'Administrador'}</strong><small>{usuario.correo || ''}</small></div></div>
          <button className="logout-button" type="button" onClick={cerrarSesion}><Icono tipo="salir" />Cerrar sesión</button>
        </div>
      </aside>

      <main className="dashboard-main equipment-page">
        <section className="equipment-form-card" aria-labelledby="assignment-form-title">
          <header className="equipment-form-header"><h1 id="assignment-form-title">Asignar equipo</h1></header>
          <form className="equipment-form" onSubmit={asignarEquipo} noValidate>
            <div className="equipment-field">
              <label htmlFor="empleado-asignacion">Empleado <span>*</span></label>
              <select id="empleado-asignacion" name="idEmpleado" value={formulario.idEmpleado} onChange={cambiarCampo} disabled={cargandoDatos} className={claseCampo('idEmpleado')} aria-invalid={Boolean(errores.idEmpleado)}>
                <option value="" disabled>{cargandoDatos ? 'Cargando empleados...' : 'Selecciona un empleado'}</option>
                {empleados.map((empleado) => <option value={empleado.id_empleado} key={empleado.id_empleado}>{`${empleado.rut} - ${empleado.nombres} ${empleado.apellidos}`}</option>)}
              </select>
              {errores.idEmpleado && <small className="field-error">{errores.idEmpleado}</small>}
            </div>
            <div className="equipment-field">
              <label htmlFor="equipo-asignacion">Equipo disponible <span>*</span></label>
              <select id="equipo-asignacion" name="idEquipo" value={formulario.idEquipo} onChange={cambiarCampo} disabled={cargandoDatos} className={claseCampo('idEquipo')} aria-invalid={Boolean(errores.idEquipo)}>
                <option value="" disabled>{cargandoDatos ? 'Cargando equipos...' : 'Selecciona un equipo'}</option>
                {equiposDisponibles.map((equipo) => <option value={equipo.id_equipo} key={equipo.id_equipo}>{`${equipo.codigo_interno} - ${equipo.nombre}`}</option>)}
              </select>
              {errores.idEquipo && <small className="field-error">{errores.idEquipo}</small>}
            </div>
            <div className="equipment-field">
              <label htmlFor="fecha-asignacion">Fecha de asignación <span>*</span></label>
              <input id="fecha-asignacion" name="fechaAsignacion" type="date" max={hoy} value={formulario.fechaAsignacion} onChange={cambiarCampo} className={claseCampo('fechaAsignacion')} aria-invalid={Boolean(errores.fechaAsignacion)} />
              {errores.fechaAsignacion && <small className="field-error">{errores.fechaAsignacion}</small>}
            </div>
            <div className="equipment-field equipment-field--full">
              <label htmlFor="observaciones-asignacion">Observaciones <span>*</span></label>
              <textarea id="observaciones-asignacion" name="observaciones" rows="4" value={formulario.observaciones} onChange={cambiarCampo} className={claseCampo('observaciones')} aria-invalid={Boolean(errores.observaciones)} />
              {errores.observaciones && <small className="field-error">{errores.observaciones}</small>}
            </div>

            {errorDatos && <p className="catalog-error equipment-field--full" role="alert">{errorDatos}</p>}
            {mensajeAsignacion && <p className={`form-submit-message form-submit-message--${mensajeAsignacion.tipo} equipment-field--full`} role={mensajeAsignacion.tipo === 'error' ? 'alert' : 'status'}>{mensajeAsignacion.texto}</p>}
            <div className="equipment-actions equipment-field--full">
              <button className="secondary-button" type="button" onClick={onInicio}>Cancelar</button>
              <button className="primary-button" type="submit" disabled={enviando || cargandoDatos}>{enviando ? 'Asignando equipo...' : 'Asignar equipo'}</button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}

export default AsignarEquipo
