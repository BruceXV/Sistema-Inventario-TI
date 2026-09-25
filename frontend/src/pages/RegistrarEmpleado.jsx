// ======================================================
// IMPORTACIONES
// ======================================================

import { useEffect, useState } from 'react'

// ======================================================
// COMPONENTES Y DATOS AUXILIARES
// ======================================================

// Mantiene los mismos iconos SVG utilizados por las demás pantallas.
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

const formularioInicial = {
  rut: '', nombres: '', apellidos: '', correo: '', telefono: '',
  idArea: '', cargo: '', fechaIngreso: '',
}

function obtenerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario')) || {}
  } catch {
    return {}
  }
}

// Comprueba el dígito verificador de un RUT chileno mediante el algoritmo módulo 11.
function rutChilenoValido(rut) {
  if (!/^(?:\d{7,8}|\d{1,2}\.\d{3}\.\d{3})-[\dKk]$/.test(rut)) return false

  const rutLimpio = rut.replace(/\./g, '').toUpperCase()
  if (!/^\d{7,8}-[\dK]$/.test(rutLimpio)) return false

  const [cuerpo, digitoIngresado] = rutLimpio.split('-')
  let suma = 0
  let multiplicador = 2

  for (let indice = cuerpo.length - 1; indice >= 0; indice -= 1) {
    suma += Number(cuerpo[indice]) * multiplicador
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1
  }

  const resultado = 11 - (suma % 11)
  const digitoCalculado = resultado === 11 ? '0' : resultado === 10 ? 'K' : String(resultado)
  return digitoIngresado === digitoCalculado
}

// El teléfono se guarda en un formato único para evitar variantes equivalentes.
function normalizarTelefono(telefono) {
  const telefonoSinEspacios = telefono.replace(/\s/g, '')
  return /^9\d{8}$/.test(telefonoSinEspacios)
    ? `+56${telefonoSinEspacios}`
    : telefonoSinEspacios
}

// ======================================================
// COMPONENTE REGISTRAR EMPLEADO
// ======================================================

function RegistrarEmpleado({ onInicio, onLogout }) {
  const usuario = obtenerUsuario()
  const [formulario, setFormulario] = useState(formularioInicial)
  const [errores, setErrores] = useState({})
  const [camposTocados, setCamposTocados] = useState({})
  const [areas, setAreas] = useState([])
  const [cargandoAreas, setCargandoAreas] = useState(true)
  const [errorAreas, setErrorAreas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensajeRegistro, setMensajeRegistro] = useState(null)

  const hoy = (() => {
    const fecha = new Date()
    const desplazamiento = fecha.getTimezoneOffset() * 60000
    return new Date(fecha.getTime() - desplazamiento).toISOString().slice(0, 10)
  })()

  // Carga las áreas activas y cancela la petición si se abandona la pantalla.
  useEffect(() => {
    const controlador = new AbortController()

    const cargarAreas = async () => {
      const token = localStorage.getItem('token')

      try {
        const respuesta = await fetch('http://localhost:3000/api/areas', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controlador.signal,
        })

        if (respuesta.status === 401 || respuesta.status === 403) {
          setErrorAreas('La sesión expiró. Inicia sesión nuevamente.')
          return
        }
        if (!respuesta.ok) {
          setErrorAreas('No fue posible cargar las áreas.')
          return
        }

        const data = await respuesta.json()
        setAreas(data)
        setErrorAreas('')
      } catch (error) {
        if (error.name !== 'AbortError') setErrorAreas('No se pudo conectar con el servidor.')
      } finally {
        if (!controlador.signal.aborted) setCargandoAreas(false)
      }
    }

    cargarAreas()
    return () => controlador.abort()
  }, [])

  // Valida un campo concreto para mostrar y retirar su mensaje de manera inmediata.
  const validarCampo = (nombre, valor) => {
    const texto = valor.trim()
    const expresionNombre = /^[\p{L}]+(?:[ '-][\p{L}]+)*$/u

    if (nombre === 'rut' && (!texto || !rutChilenoValido(texto))) return 'Ingresa un RUT chileno válido.'
    if (nombre === 'nombres' && (!texto || !expresionNombre.test(texto))) return 'Ingresa nombres válidos, sin números.'
    if (nombre === 'apellidos' && (!texto || !expresionNombre.test(texto))) return 'Ingresa apellidos válidos, sin números.'
    if (nombre === 'correo' && (!texto || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto))) return 'Ingresa un correo válido.'
    if (nombre === 'telefono' && texto && !/^(?:9\d{8}|\+569\d{8})$/.test(texto.replace(/\s/g, ''))) return 'Ingresa un teléfono chileno válido.'
    if (nombre === 'idArea' && !areas.some((area) => String(area.id_area) === texto)) return 'Selecciona un área válida.'
    if (nombre === 'cargo' && texto && /^\d+$/.test(texto)) return 'Ingresa un cargo válido.'
    if (nombre === 'fechaIngreso' && texto && texto > hoy) return 'La fecha de ingreso no puede ser futura.'
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

  // Al abandonar un control comienza su validación visible.
  const tocarCampo = (event) => {
    const { name, value } = event.target
    setCamposTocados((actuales) => ({ ...actuales, [name]: true }))
    actualizarErrorCampo(name, value)
  }

  const validarFormulario = (datos) => {
    const nuevosErrores = {}
    Object.keys(formularioInicial).forEach((nombre) => {
      const error = validarCampo(nombre, datos[nombre])
      if (error) nuevosErrores[nombre] = error
    })
    return nuevosErrores
  }

  // Envía el empleado con el JWT y traduce las respuestas conocidas del backend.
  const registrarEmpleado = async (event) => {
    event.preventDefault()
    if (enviando) return

    const datos = Object.fromEntries(
      Object.entries(formulario).map(([campo, valor]) => [campo, valor.trim()]),
    )
    const nuevosErrores = validarFormulario(datos)
    setFormulario(datos)
    setErrores(nuevosErrores)
    setCamposTocados(Object.fromEntries(Object.keys(formularioInicial).map((campo) => [campo, true])))
    setMensajeRegistro(null)

    const primerCampoInvalido = Object.keys(nuevosErrores)[0]
    if (primerCampoInvalido) {
      requestAnimationFrame(() => document.querySelector(`[name="${primerCampoInvalido}"]`)?.focus())
      return
    }

    setEnviando(true)
    const token = localStorage.getItem('token')

    try {
      const respuesta = await fetch('http://localhost:3000/api/empleados', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut: datos.rut,
          nombres: datos.nombres,
          apellidos: datos.apellidos,
          correo: datos.correo,
          telefono: datos.telefono ? normalizarTelefono(datos.telefono) : null,
          id_area: Number(datos.idArea),
          cargo: datos.cargo || null,
          fecha_ingreso: datos.fechaIngreso || null,
        }),
      })
      const data = await respuesta.json()

      if (respuesta.status === 201) {
        setFormulario(formularioInicial)
        setErrores({})
        setCamposTocados({})
        setMensajeRegistro({ tipo: 'exito', texto: 'Empleado registrado correctamente.' })
      } else if (respuesta.status === 401 || respuesta.status === 403) {
        setMensajeRegistro({ tipo: 'error', texto: 'La sesión expiró. Inicia sesión nuevamente.' })
      } else if (respuesta.status === 409 && data.mensaje === 'Ya existe un empleado con ese RUT') {
        setMensajeRegistro({ tipo: 'error', texto: 'Ya existe un empleado con ese RUT.' })
      } else if (respuesta.status === 409 && data.mensaje === 'Ya existe un empleado con ese correo') {
        setMensajeRegistro({ tipo: 'error', texto: 'Ya existe un empleado con ese correo.' })
      } else if (respuesta.status === 400 && data.mensaje === 'El área seleccionada no existe') {
        setMensajeRegistro({ tipo: 'error', texto: 'El área seleccionada no existe.' })
      } else {
        setMensajeRegistro({ tipo: 'error', texto: data.mensaje || 'No fue posible registrar el empleado.' })
      }
    } catch {
      setMensajeRegistro({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' })
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
        <div className="sidebar-brand">
          <div className="sidebar-logo"><Icono tipo="equipos" /></div>
          <div><strong>Inventario TI</strong><p>Sistema de gestión de equipos de tecnología</p></div>
        </div>
        <nav className="sidebar-nav" aria-label="Navegación principal">
          {opciones.map(([icono, texto]) => (
            <button className={texto === 'Empleados' ? 'active' : ''} type="button" key={texto} onClick={texto === 'Inicio' ? onInicio : undefined}>
              <Icono tipo={icono} /><span>{texto}</span>
              {texto !== 'Inicio' && <span className="nav-arrow">›</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-account">
          <div className="account-info">
            <span className="account-avatar"><Icono tipo="administradores" /></span>
            <div><strong>{usuario.nombre || 'Administrador'}</strong><small>{usuario.correo || ''}</small></div>
          </div>
          <button className="logout-button" type="button" onClick={cerrarSesion}><Icono tipo="salir" />Cerrar sesión</button>
        </div>
      </aside>

      <main className="dashboard-main equipment-page">
        <section className="equipment-form-card" aria-labelledby="employee-form-title">
          <header className="equipment-form-header"><h1 id="employee-form-title">Registrar empleado</h1></header>
          <form className="equipment-form" onSubmit={registrarEmpleado} noValidate>
            <div className="equipment-field">
              <label htmlFor="rut">RUT <span>*</span></label>
              <input id="rut" name="rut" type="text" placeholder="Ej: 12.345.678-5" value={formulario.rut} onChange={cambiarCampo} onBlur={tocarCampo} className={claseCampo('rut')} aria-invalid={Boolean(errores.rut)} />
              {errores.rut && <small className="field-error">{errores.rut}</small>}
            </div>
            <div className="equipment-field">
              <label htmlFor="nombres">Nombres <span>*</span></label>
              <input id="nombres" name="nombres" type="text" placeholder="Ej: Juan Carlos" value={formulario.nombres} onChange={cambiarCampo} onBlur={tocarCampo} className={claseCampo('nombres')} aria-invalid={Boolean(errores.nombres)} />
              {errores.nombres && <small className="field-error">{errores.nombres}</small>}
            </div>
            <div className="equipment-field">
              <label htmlFor="apellidos">Apellidos <span>*</span></label>
              <input id="apellidos" name="apellidos" type="text" placeholder="Ej: Pérez González" value={formulario.apellidos} onChange={cambiarCampo} onBlur={tocarCampo} className={claseCampo('apellidos')} aria-invalid={Boolean(errores.apellidos)} />
              {errores.apellidos && <small className="field-error">{errores.apellidos}</small>}
            </div>
            <div className="equipment-field">
              <label htmlFor="correo-empleado">Correo <span>*</span></label>
              <input id="correo-empleado" name="correo" type="email" placeholder="Ej: juan.perez@empresa.com" value={formulario.correo} onChange={cambiarCampo} onBlur={tocarCampo} className={claseCampo('correo')} aria-invalid={Boolean(errores.correo)} />
              {errores.correo && <small className="field-error">{errores.correo}</small>}
            </div>
            <div className="equipment-field">
              <label htmlFor="telefono">Teléfono</label>
              <input id="telefono" name="telefono" type="tel" placeholder="Ej: +56 9 1234 5678" value={formulario.telefono} onChange={cambiarCampo} onBlur={tocarCampo} className={claseCampo('telefono')} aria-invalid={Boolean(errores.telefono)} />
              {errores.telefono && <small className="field-error">{errores.telefono}</small>}
            </div>
            <div className="equipment-field">
              <label htmlFor="id-area">Área <span>*</span></label>
              <select id="id-area" name="idArea" value={formulario.idArea} onChange={cambiarCampo} onBlur={tocarCampo} disabled={cargandoAreas} className={claseCampo('idArea')} aria-invalid={Boolean(errores.idArea)}>
                <option value="" disabled>{cargandoAreas ? 'Cargando áreas...' : 'Selecciona un área'}</option>
                {areas.map((area) => <option value={area.id_area} key={area.id_area}>{area.nombre}</option>)}
              </select>
              {errores.idArea && <small className="field-error">{errores.idArea}</small>}
            </div>
            <div className="equipment-field">
              <label htmlFor="cargo">Cargo</label>
              <input id="cargo" name="cargo" type="text" placeholder="Ej: Soporte TI" value={formulario.cargo} onChange={cambiarCampo} onBlur={tocarCampo} className={claseCampo('cargo')} aria-invalid={Boolean(errores.cargo)} />
              {errores.cargo && <small className="field-error">{errores.cargo}</small>}
            </div>
            <div className="equipment-field">
              <label htmlFor="fecha-ingreso">Fecha de ingreso</label>
              <input id="fecha-ingreso" name="fechaIngreso" type="date" max={hoy} value={formulario.fechaIngreso} onChange={cambiarCampo} onBlur={tocarCampo} className={claseCampo('fechaIngreso')} aria-invalid={Boolean(errores.fechaIngreso)} />
              {errores.fechaIngreso && <small className="field-error">{errores.fechaIngreso}</small>}
            </div>

            {errorAreas && <p className="catalog-error equipment-field--full" role="alert">{errorAreas}</p>}
            {mensajeRegistro && <p className={`form-submit-message form-submit-message--${mensajeRegistro.tipo} equipment-field--full`} role={mensajeRegistro.tipo === 'error' ? 'alert' : 'status'}>{mensajeRegistro.texto}</p>}
            <div className="equipment-actions equipment-field--full">
              <button className="secondary-button" type="button" onClick={onInicio}>Cancelar</button>
              <button className="primary-button" type="submit" disabled={enviando || cargandoAreas}>{enviando ? 'Registrando empleado...' : 'Registrar empleado'}</button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}

export default RegistrarEmpleado
