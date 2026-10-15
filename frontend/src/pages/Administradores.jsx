// ======================================================
// IMPORTACIONES
// ======================================================

import { useEffect, useRef, useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'

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

const formularioInicial = { nombre: '', correo: '', password: '' }

function obtenerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario')) || {}
  } catch {
    return {}
  }
}

// Presenta la fecha de creación en español y según la zona horaria chilena.
function formatearFecha(fecha) {
  if (!fecha) return '-'
  const valor = new Date(fecha)
  if (Number.isNaN(valor.getTime())) return '-'
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago',
  }).format(valor)
}

function ordenarAdministradores(administradores) {
  return [...administradores].sort((a, b) => Number(b.estado) - Number(a.estado) || a.nombre.localeCompare(b.nombre, 'es'))
}

// ======================================================
// COMPONENTE ADMINISTRADORES
// ======================================================

function Administradores({ onInicio, onNavigate, onLogout }) {
  const usuario = obtenerUsuario()
  const [administradores, setAdministradores] = useState([])
  const [cargandoAdministradores, setCargandoAdministradores] = useState(true)
  const [errorAdministradores, setErrorAdministradores] = useState('')
  const [formulario, setFormulario] = useState(formularioInicial)
  const [errores, setErrores] = useState({})
  const [camposTocados, setCamposTocados] = useState({})
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [registrando, setRegistrando] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState(null)
  const [mensajeRegistro, setMensajeRegistro] = useState(null)
  const [mensajeEstado, setMensajeEstado] = useState(null)
  const controladorListado = useRef(null)

  // Carga la lista protegida con el JWT y cancela la petición al salir.
  const cargarAdministradores = async () => {
    controladorListado.current?.abort()
    const controlador = new AbortController()
    controladorListado.current = controlador
    setCargandoAdministradores(true)
    setErrorAdministradores('')

    try {
      const token = localStorage.getItem('token')
      const respuesta = await fetch('http://localhost:3000/api/administradores', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controlador.signal,
      })

      if (respuesta.status === 401 || respuesta.status === 403) {
        setErrorAdministradores('La sesión expiró o no es válida. Inicia sesión nuevamente.')
        return
      }

      if (!respuesta.ok) {
        const data = await respuesta.json().catch(() => null)
        setErrorAdministradores(data?.mensaje || 'No se pudieron cargar los administradores.')
        return
      }

      const data = await respuesta.json()
      setAdministradores(Array.isArray(data) ? data : [])
    } catch (error) {
      if (error.name !== 'AbortError') setErrorAdministradores('No se pudo conectar con el servidor.')
    } finally {
      if (!controlador.signal.aborted && controladorListado.current === controlador) {
        setCargandoAdministradores(false)
      }
    }
  }

  useEffect(() => {
    cargarAdministradores()
    return () => controladorListado.current?.abort()
  }, [])

  // Valida cada campo para mostrar el error únicamente después de tocarlo.
  const validarCampo = (nombre, valor) => {
    if (nombre === 'nombre') {
      const texto = valor.trim()
      if (texto.length < 2 || texto.length > 100) return 'El nombre debe tener entre 2 y 100 caracteres.'
    }
    if (nombre === 'correo') {
      const texto = valor.trim()
      if (!texto) return 'Ingresa el correo del administrador.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) return 'Ingresa un correo válido.'
    }
    if (nombre === 'password' && (valor.length < 8 || valor.length > 72)) {
      return 'La contraseña debe tener entre 8 y 72 caracteres.'
    }
    return ''
  }

  const actualizarErrorCampo = (nombre, valor) => {
    const error = validarCampo(nombre, valor)
    setErrores((actuales) => {
      const siguientes = { ...actuales }
      if (error) siguientes[nombre] = error
      else delete siguientes[nombre]
      return siguientes
    })
  }

  const cambiarCampo = (event) => {
    const { name, value } = event.target
    setFormulario((actual) => ({ ...actual, [name]: value }))
    setMensajeRegistro(null)
    if (camposTocados[name]) actualizarErrorCampo(name, value)
  }

  const tocarCampo = (event) => {
    const { name, value } = event.target
    setCamposTocados((actuales) => ({ ...actuales, [name]: true }))
    actualizarErrorCampo(name, value)
  }

  const validarFormulario = (datos) => {
    const nuevosErrores = {}
    Object.keys(formularioInicial).forEach((campo) => {
      const error = validarCampo(campo, datos[campo])
      if (error) nuevosErrores[campo] = error
    })
    return nuevosErrores
  }

  // Envía solo nombre, correo y contraseña; esta última nunca se persiste en el navegador.
  const registrarAdministrador = async (event) => {
    event.preventDefault()
    if (registrando) return

    const datos = {
      nombre: formulario.nombre.trim(),
      correo: formulario.correo.trim().toLowerCase(),
      password: formulario.password,
    }
    const nuevosErrores = validarFormulario(datos)
    setFormulario(datos)
    setErrores(nuevosErrores)
    setCamposTocados({ nombre: true, correo: true, password: true })
    setMensajeRegistro(null)

    const primerCampoInvalido = Object.keys(nuevosErrores)[0]
    if (primerCampoInvalido) {
      requestAnimationFrame(() => document.querySelector(`[name="${primerCampoInvalido}"]`)?.focus())
      return
    }

    setRegistrando(true)

    try {
      const token = localStorage.getItem('token')
      const respuesta = await fetch('http://localhost:3000/api/administradores', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      })
      const data = await respuesta.json().catch(() => null)

      if (respuesta.status === 201) {
        setFormulario(formularioInicial)
        setErrores({})
        setCamposTocados({})
        setMostrarPassword(false)
        setMensajeRegistro({ tipo: 'exito', texto: 'Administrador creado correctamente.' })
        if (data?.administrador) {
          setAdministradores((actuales) => ordenarAdministradores([...actuales, data.administrador]))
        }
      } else if (respuesta.status === 401 || respuesta.status === 403) {
        setMensajeRegistro({ tipo: 'error', texto: 'La sesión expiró o no es válida. Inicia sesión nuevamente.' })
      } else if (respuesta.status === 409) {
        setMensajeRegistro({ tipo: 'error', texto: data?.mensaje || 'Ya existe un usuario registrado con ese correo.' })
      } else {
        setMensajeRegistro({ tipo: 'error', texto: data?.mensaje || 'No fue posible registrar el administrador.' })
      }
    } catch {
      setMensajeRegistro({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' })
    } finally {
      setRegistrando(false)
    }
  }

  // Solicita confirmación antes de suspender y actualiza solo la fila modificada.
  const cambiarEstadoAdministrador = async (administrador) => {
    if (cambiandoEstado !== null) return
    const nuevoEstado = !administrador.estado

    if (!nuevoEstado) {
      const confirmado = window.confirm('¿Seguro que deseas desactivar esta cuenta? El administrador no podrá iniciar sesión mientras permanezca inactivo.')
      if (!confirmado) return
    }

    setCambiandoEstado(administrador.id_usuario)
    setMensajeEstado(null)

    try {
      const token = localStorage.getItem('token')
      const respuesta = await fetch(`http://localhost:3000/api/administradores/${administrador.id_usuario}/estado`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      const data = await respuesta.json().catch(() => null)

      if (respuesta.ok && data?.administrador) {
        setAdministradores((actuales) => ordenarAdministradores(
          actuales.map((item) => item.id_usuario === data.administrador.id_usuario ? data.administrador : item),
        ))
        setMensajeEstado({ tipo: 'exito', texto: `${data.mensaje}.` })
      } else if (respuesta.status === 401 || respuesta.status === 403) {
        setMensajeEstado({ tipo: 'error', texto: 'La sesión expiró o no es válida. Inicia sesión nuevamente.' })
      } else {
        setMensajeEstado({ tipo: 'error', texto: data?.mensaje || 'No fue posible cambiar el estado del administrador.' })
      }
    } catch {
      setMensajeEstado({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' })
    } finally {
      setCambiandoEstado(null)
    }
  }

  const cerrarSesion = () => {
    controladorListado.current?.abort()
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    onLogout()
  }

  const claseCampo = (nombre) => errores[nombre] ? 'field-control--error' : ''

  // ======================================================
  // RENDERIZADO
  // ======================================================

  return (
    <div className="dashboard">
      <Sidebar seccionActiva="Administradores" usuario={usuario} onInicio={onInicio} onNavigate={onNavigate} onLogout={cerrarSesion} />

      <main className="dashboard-main administrators-page">
        <div className="administrators-content">
          <header className="search-equipment-header"><h1>Administradores</h1></header>

          <section className="equipment-form-card administrator-form-card" aria-labelledby="administrator-form-title">
            <header className="equipment-form-header"><h2 id="administrator-form-title">Registrar administrador</h2></header>
            <form className="equipment-form administrator-form" onSubmit={registrarAdministrador} noValidate>
              <div className="equipment-field">
                <label htmlFor="nombre-administrador">Nombre <span>*</span></label>
                <input id="nombre-administrador" name="nombre" type="text" maxLength="100" value={formulario.nombre} onChange={cambiarCampo} onBlur={tocarCampo} className={claseCampo('nombre')} aria-invalid={Boolean(errores.nombre)} />
                {errores.nombre && <small className="field-error">{errores.nombre}</small>}
              </div>
              <div className="equipment-field">
                <label htmlFor="correo-administrador">Correo <span>*</span></label>
                <input id="correo-administrador" name="correo" type="email" maxLength="254" value={formulario.correo} onChange={cambiarCampo} onBlur={tocarCampo} className={claseCampo('correo')} aria-invalid={Boolean(errores.correo)} />
                {errores.correo && <small className="field-error">{errores.correo}</small>}
              </div>
              <div className="equipment-field equipment-field--full">
                <label htmlFor="password-administrador">Contraseña <span>*</span></label>
                <div className="administrator-password-control">
                  <input id="password-administrador" name="password" type={mostrarPassword ? 'text' : 'password'} minLength="8" maxLength="72" autoComplete="new-password" value={formulario.password} onChange={cambiarCampo} onBlur={tocarCampo} className={claseCampo('password')} aria-invalid={Boolean(errores.password)} />
                  <button type="button" aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={mostrarPassword} onClick={() => setMostrarPassword((visible) => !visible)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>
                  </button>
                </div>
                {errores.password && <small className="field-error">{errores.password}</small>}
              </div>

              {mensajeRegistro && <p className={`form-submit-message form-submit-message--${mensajeRegistro.tipo} equipment-field--full`} role={mensajeRegistro.tipo === 'error' ? 'alert' : 'status'}>{mensajeRegistro.texto}</p>}
              <div className="equipment-actions equipment-field--full">
                <button className="primary-button" type="submit" disabled={registrando}>{registrando ? 'Registrando administrador...' : 'Registrar administrador'}</button>
              </div>
            </form>
          </section>

          <section className="equipment-table-card administrator-table-card" aria-labelledby="administrator-list-title">
            <header className="administrator-table-header"><h2 id="administrator-list-title">Administradores registrados</h2></header>
            {mensajeEstado && <p className={`form-submit-message form-submit-message--${mensajeEstado.tipo} administrator-state-message`} role={mensajeEstado.tipo === 'error' ? 'alert' : 'status'}>{mensajeEstado.texto}</p>}
            <div className="equipment-table-wrapper">
              <table className="equipment-table administrator-table">
                <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Fecha creación</th><th>Estado</th><th>Acción</th></tr></thead>
                <tbody>
                  {cargandoAdministradores && <tr><td className="equipment-empty-state" colSpan="6">Cargando administradores...</td></tr>}
                  {!cargandoAdministradores && errorAdministradores && <tr><td className="equipment-empty-state" colSpan="6">{errorAdministradores}</td></tr>}
                  {!cargandoAdministradores && !errorAdministradores && administradores.length === 0 && <tr><td className="equipment-empty-state" colSpan="6">No hay administradores registrados.</td></tr>}
                  {!cargandoAdministradores && !errorAdministradores && administradores.map((administrador) => (
                    <tr key={administrador.id_usuario}>
                      <td>{administrador.nombre}</td>
                      <td>{administrador.correo}</td>
                      <td>{administrador.rol}</td>
                      <td>{formatearFecha(administrador.fecha_creacion)}</td>
                      <td>{administrador.estado ? 'Activo' : 'Inactivo'}</td>
                      <td>
                        <button className={`administrator-state-button ${administrador.estado ? 'administrator-state-button--deactivate' : 'administrator-state-button--activate'}`} type="button" disabled={cambiandoEstado !== null} onClick={() => cambiarEstadoAdministrador(administrador)}>
                          {cambiandoEstado === administrador.id_usuario ? 'Procesando...' : administrador.estado ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default Administradores
