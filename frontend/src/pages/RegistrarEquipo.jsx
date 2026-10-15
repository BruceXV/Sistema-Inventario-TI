// ======================================================
// IMPORTACIONES
// ======================================================

// useState controla formulario y mensajes; useEffect carga los catálogos iniciales.
import { useEffect, useRef, useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'

// ======================================================
// COMPONENTES Y DATOS AUXILIARES
// ======================================================

// Centraliza los iconos SVG utilizados en el menú lateral.
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
  ['inicio', 'Inicio'],
  ['equipos', 'Equipos'],
  ['empleados', 'Empleados'],
  ['asignaciones', 'Asignaciones'],
  ['devoluciones', 'Devoluciones'],
  ['historial', 'Historial'],
  ['administradores', 'Administradores'],
]

// Desplegable accesible que limita visualmente el catálogo a diez filas.
// Todos los tipos permanecen disponibles mediante desplazamiento vertical.
function SelectorTipoEquipo({ tipos, value, onChange, disabled, invalido }) {
  const [abierto, setAbierto] = useState(false)
  const [indiceActivo, setIndiceActivo] = useState(0)
  const contenedorRef = useRef(null)
  const botonRef = useRef(null)
  const opcionesRef = useRef([])

  // Ordena únicamente la presentación: "Otro" permanece arriba y los tipos
  // restantes se muestran alfabéticamente sin alterar sus identificadores.
  const tiposOrdenados = [...tipos].sort((tipoA, tipoB) => {
    const nombreA = tipoA.nombre.trim()
    const nombreB = tipoB.nombre.trim()
    const esOtroA = nombreA.toLocaleLowerCase('es') === 'otro'
    const esOtroB = nombreB.toLocaleLowerCase('es') === 'otro'

    if (esOtroA !== esOtroB) return esOtroA ? -1 : 1
    return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' })
  })
  const opcionesSelector = [{ id_tipo: '', nombre: 'Selecciona un tipo' }, ...tiposOrdenados]
  const tipoSeleccionado = tipos.find((tipo) => String(tipo.id_tipo) === value)
  const obtenerNombreVisible = (tipo) => tipo?.nombre.trim().toLocaleLowerCase('es') === 'otro'
    ? 'Agregar nuevo tipo'
    : tipo?.nombre

  useEffect(() => {
    const cerrarAlHacerClickFuera = (event) => {
      if (!contenedorRef.current?.contains(event.target)) setAbierto(false)
    }

    document.addEventListener('mousedown', cerrarAlHacerClickFuera)
    return () => document.removeEventListener('mousedown', cerrarAlHacerClickFuera)
  }, [])

  useEffect(() => {
    if (!abierto) return
    const indiceSeleccionado = opcionesSelector.findIndex((tipo) => String(tipo.id_tipo) === value)
    const siguienteIndice = indiceSeleccionado >= 0 ? indiceSeleccionado : 0
    setIndiceActivo(siguienteIndice)
    requestAnimationFrame(() => opcionesRef.current[siguienteIndice]?.focus())
  }, [abierto, tipos, value])

  const seleccionar = (tipo) => {
    onChange(String(tipo.id_tipo))
    setAbierto(false)
    requestAnimationFrame(() => botonRef.current?.focus())
  }

  const manejarTeclaBoton = (event) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      setAbierto(true)
    }
  }

  const manejarTeclaOpcion = (event, indice) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const movimiento = event.key === 'ArrowDown' ? 1 : -1
      const siguiente = (indice + movimiento + opcionesSelector.length) % opcionesSelector.length
      setIndiceActivo(siguiente)
      opcionesRef.current[siguiente]?.focus()
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const siguiente = event.key === 'Home' ? 0 : opcionesSelector.length - 1
      setIndiceActivo(siguiente)
      opcionesRef.current[siguiente]?.focus()
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      seleccionar(opcionesSelector[indice])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setAbierto(false)
      botonRef.current?.focus()
    } else if (event.key === 'Tab') {
      setAbierto(false)
    }
  }

  return (
    <div className="equipment-type-select" ref={contenedorRef}>
      <button
        id="tipo-equipo"
        ref={botonRef}
        className={`equipment-type-select-trigger ${invalido ? 'field-control--error' : ''}`}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls="tipo-equipo-opciones"
        aria-invalid={invalido}
        disabled={disabled}
        onClick={() => setAbierto((actual) => !actual)}
        onKeyDown={manejarTeclaBoton}
      >
        <span className={tipoSeleccionado ? '' : 'placeholder'}>{obtenerNombreVisible(tipoSeleccionado) || 'Selecciona un tipo'}</span>
        <span className={`equipment-type-select-arrow ${abierto ? 'open' : ''}`} aria-hidden="true">⌄</span>
      </button>

      {abierto && opcionesSelector.length > 0 && (
        <div id="tipo-equipo-opciones" className="equipment-type-select-menu" role="listbox" aria-label="Tipo de equipo">
          {opcionesSelector.map((tipo, indice) => (
            <button
              ref={(elemento) => { opcionesRef.current[indice] = elemento }}
              className={indice === indiceActivo ? 'active' : ''}
              type="button"
              role="option"
              aria-selected={String(tipo.id_tipo) === value}
              tabIndex={indice === indiceActivo ? 0 : -1}
              key={tipo.id_tipo || 'seleccion-inicial'}
              onClick={() => seleccionar(tipo)}
              onKeyDown={(event) => manejarTeclaOpcion(event, indice)}
            >
              {obtenerNombreVisible(tipo)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Proporciona una única estructura para iniciar y limpiar el formulario.
const formularioInicial = {
  codigoInterno: '', nombreEquipo: '', tipoEquipo: '', marca: '', estado: '',
  tipoPersonalizado: '', modelo: '', numeroSerie: '', macAddress: '', ipInterna: '', fechaCompra: '', observaciones: '',
}

// Recupera de forma segura el usuario autenticado guardado durante el Login.
function obtenerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario')) || {}
  } catch {
    return {}
  }
}

// ======================================================
// COMPONENTE REGISTRAR EQUIPO
// ======================================================

function RegistrarEquipo({ onInicio, onNavigate, onLogout }) {
  const usuario = obtenerUsuario()

  // ======================================================
  // ESTADOS DEL COMPONENTE
  // ======================================================

  // Catálogos utilizados para construir los selects de tipo y estado.
  const [tiposEquipo, setTiposEquipo] = useState([])
  const [estadosEquipo, setEstadosEquipo] = useState([])
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true)
  const [errorCatalogos, setErrorCatalogos] = useState(false)

  // Datos controlados del formulario y errores asociados a cada campo.
  const [formulario, setFormulario] = useState(formularioInicial)
  const [errores, setErrores] = useState({})

  // Controlan el envío para evitar duplicados y mostrar el resultado del backend.
  const [enviando, setEnviando] = useState(false)
  const [mensajeRegistro, setMensajeRegistro] = useState(null)
  const [modalExitoAbierto, setModalExitoAbierto] = useState(false)
  const botonAceptarRef = useRef(null)
  const botonRegistrarRef = useRef(null)

  // Genera la fecha local actual para limitar y validar la fecha de compra.
  const hoy = (() => {
    const fecha = new Date()
    const desplazamiento = fecha.getTimezoneOffset() * 60000
    return new Date(fecha.getTime() - desplazamiento).toISOString().slice(0, 10)
  })()

  // ======================================================
  // CARGA DE CATÁLOGOS
  // ======================================================

  // Consulta tipos y estados cuando la pantalla se monta por primera vez.
  useEffect(() => {
    // AbortController evita actualizar el componente si se abandona la pantalla durante la carga.
    const controlador = new AbortController()

    const cargarCatalogos = async () => {
      try {
        // Promise.all carga ambos catálogos en paralelo para reducir el tiempo de espera.
        const [respuestaTipos, respuestaEstados] = await Promise.all([
          fetch('http://localhost:3000/api/tipos-equipo', { signal: controlador.signal }),
          fetch('http://localhost:3000/api/estados-equipo', { signal: controlador.signal }),
        ])

        if (!respuestaTipos.ok || !respuestaEstados.ok) {
          throw new Error('Error al cargar los catálogos')
        }

        const [tipos, estados] = await Promise.all([
          respuestaTipos.json(),
          respuestaEstados.json(),
        ])

        setTiposEquipo(tipos)
        setEstadosEquipo(estados)
        setErrorCatalogos(false)
      } catch (error) {
        // Los errores reales se muestran en el formulario; una cancelación normal se ignora.
        if (error.name !== 'AbortError') {
          setErrorCatalogos(true)
        }
      } finally {
        if (!controlador.signal.aborted) {
          setCargandoCatalogos(false)
        }
      }
    }

    cargarCatalogos()

    return () => controlador.abort()
  }, [])

  // Al abrir el modal, mueve el foco a su acción principal para facilitar
  // el uso mediante teclado y lectores de pantalla.
  useEffect(() => {
    if (modalExitoAbierto) botonAceptarRef.current?.focus()
  }, [modalExitoAbierto])

  // ======================================================
  // SESIÓN Y NAVEGACIÓN
  // ======================================================

  // Borra el JWT y el usuario local antes de volver al Login mediante App.
  const cerrarSesion = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    onLogout()
  }

  // ======================================================
  // CONTROL Y VALIDACIÓN DEL FORMULARIO
  // ======================================================

  // Actualiza el campo editado y retira su error para permitir una nueva validación.
  const cambiarCampo = (event) => {
    const { name, value } = event.target
    setFormulario((actual) => {
      const siguiente = { ...actual, [name]: value }

      if (name === 'tipoEquipo') {
        // El campo personalizado solo tiene sentido mientras el tipo seleccionado sea "Otro".
        const tipoSeleccionado = tiposEquipo.find((tipo) => String(tipo.id_tipo) === value)
        if (tipoSeleccionado?.nombre.trim().toLowerCase() !== 'otro') {
          siguiente.tipoPersonalizado = ''
        }
      }

      return siguiente
    })
    setMensajeRegistro(null)
    if (errores[name] || (name === 'tipoEquipo' && errores.tipoPersonalizado)) {
      setErrores((actuales) => {
        const siguientes = { ...actuales }
        delete siguientes[name]
        if (name === 'tipoEquipo') delete siguientes.tipoPersonalizado
        return siguientes
      })
    }
  }

  // Aplica las reglas de formato y verifica que los IDs pertenezcan a los catálogos cargados.
  const validarFormulario = (datos) => {
    const nuevosErrores = {}
    const codigoValido = /^[A-Za-z0-9_-]{2,30}$/
    const macValida = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/
    const ipv4Valida = (valor) => {
      const partes = valor.split('.')
      return partes.length === 4 && partes.every((parte) => /^\d{1,3}$/.test(parte) && Number(parte) <= 255)
    }

    if (!codigoValido.test(datos.codigoInterno)) nuevosErrores.codigoInterno = 'Ingresa un código interno válido.'
    if (datos.nombreEquipo.length < 2 || datos.nombreEquipo.length > 100) nuevosErrores.nombreEquipo = 'Ingresa un nombre válido para el equipo.'
    if (!tiposEquipo.some((tipo) => String(tipo.id_tipo) === datos.tipoEquipo)) nuevosErrores.tipoEquipo = 'Selecciona un tipo de equipo.'
    const tipoSeleccionado = tiposEquipo.find((tipo) => String(tipo.id_tipo) === datos.tipoEquipo)
    if (tipoSeleccionado?.nombre.trim().toLowerCase() === 'otro' && (datos.tipoPersonalizado.length < 2 || datos.tipoPersonalizado.length > 80)) nuevosErrores.tipoPersonalizado = 'Ingresa un tipo de equipo válido.'
    if (datos.marca.length < 2 || datos.marca.length > 80) nuevosErrores.marca = 'Ingresa una marca válida.'
    if (!estadosEquipo.some((estado) => String(estado.id_estado) === datos.estado && estado.nombre.trim().toLowerCase() !== 'asignado')) nuevosErrores.estado = 'Selecciona un estado válido.'
    if (datos.modelo.length > 100) nuevosErrores.modelo = 'El modelo no puede superar los 100 caracteres.'
    if (datos.numeroSerie.length > 100) nuevosErrores.numeroSerie = 'El número de serie no puede superar los 100 caracteres.'
    if (datos.macAddress && !macValida.test(datos.macAddress)) nuevosErrores.macAddress = 'Ingresa una dirección MAC válida.'
    if (datos.ipInterna && !ipv4Valida(datos.ipInterna)) nuevosErrores.ipInterna = 'Ingresa una dirección IPv4 válida.'
    if (!datos.fechaCompra) nuevosErrores.fechaCompra = 'Selecciona la fecha de compra.'
    else if (datos.fechaCompra > hoy) nuevosErrores.fechaCompra = 'La fecha de compra no puede ser futura.'
    if (datos.observaciones.length < 5 || datos.observaciones.length > 500) nuevosErrores.observaciones = 'Ingresa una observación válida.'

    return nuevosErrores
  }

  // ======================================================
  // ENVÍO AL BACKEND
  // ======================================================

  // Valida el formulario y, si es correcto, registra el equipo mediante la API protegida.
  const enviarFormulario = async (event) => {
    event.preventDefault()

    if (enviando) return

    const datosNormalizados = Object.fromEntries(
      Object.entries(formulario).map(([campo, valor]) => [campo, typeof valor === 'string' ? valor.trim() : valor]),
    )
    const nuevosErrores = validarFormulario(datosNormalizados)

    setFormulario(datosNormalizados)
    setErrores(nuevosErrores)
    setMensajeRegistro(null)

    const primerCampoInvalido = Object.keys(nuevosErrores)[0]
    if (primerCampoInvalido) {
      // Lleva el foco al primer dato que necesita corrección.
      requestAnimationFrame(() => document.querySelector(`[name="${primerCampoInvalido}"]`)?.focus())
      return
    }

    const opcional = (valor) => valor || null
    // Obtenemos el JWT guardado durante el Login para demostrar la autenticación al backend.
    const token = localStorage.getItem('token')

    // Adaptamos los nombres del estado de React al formato esperado por POST /api/equipos.
    const datosEquipo = {
      codigo_interno: datosNormalizados.codigoInterno,
      nombre: datosNormalizados.nombreEquipo,
      id_tipo: Number(datosNormalizados.tipoEquipo),
      tipo_personalizado: tiposEquipo.find((tipo) => String(tipo.id_tipo) === datosNormalizados.tipoEquipo)?.nombre.trim().toLowerCase() === 'otro'
        ? datosNormalizados.tipoPersonalizado
        : null,
      marca: datosNormalizados.marca,
      modelo: opcional(datosNormalizados.modelo),
      serial: opcional(datosNormalizados.numeroSerie),
      mac_address: opcional(datosNormalizados.macAddress),
      ip_interna: opcional(datosNormalizados.ipInterna),
      fecha_compra: opcional(datosNormalizados.fechaCompra),
      id_estado: Number(datosNormalizados.estado),
      observaciones: opcional(datosNormalizados.observaciones),
    }

    setEnviando(true)

    try {
      // Authorization envía el JWT con el esquema Bearer requerido por la ruta protegida.
      const respuesta = await fetch('http://localhost:3000/api/equipos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosEquipo),
      })
      const data = await respuesta.json()

      if (respuesta.status === 201) {
        // Tras registrar, limpiamos los campos pero conservamos los catálogos ya cargados.
        setFormulario(formularioInicial)
        setErrores({})
        setMensajeRegistro(null)
        setModalExitoAbierto(true)
      } else if (respuesta.status === 409 && data.mensaje === 'Ya existe un equipo con ese código interno') {
        setMensajeRegistro({ tipo: 'error', texto: 'Ya existe un equipo con ese código interno' })
      } else if (respuesta.status === 409 && data.mensaje === 'Ya existe un equipo con ese número de serie') {
        setMensajeRegistro({ tipo: 'error', texto: 'Ya existe un equipo con ese número de serie' })
      } else if (respuesta.status === 401) {
        // No eliminamos automáticamente la sesión para que el usuario pueda leer el aviso.
        setMensajeRegistro({ tipo: 'error', texto: 'La sesión expiró. Inicia sesión nuevamente.' })
      } else {
        setMensajeRegistro({ tipo: 'error', texto: data.mensaje || 'No fue posible registrar el equipo' })
      }
    } catch {
      // fetch falla aquí si el backend no está disponible o existe un problema de red.
      setMensajeRegistro({ tipo: 'error', texto: 'No se pudo conectar con el servidor' })
    } finally {
      setEnviando(false)
    }
  }

  const cerrarModalExito = () => {
    setModalExitoAbierto(false)
    requestAnimationFrame(() => botonRegistrarRef.current?.focus())
  }

  const irABuscarEquipos = () => {
    setModalExitoAbierto(false)
    onNavigate('buscar-equipos')
  }

  // Escape cierra el diálogo y Tab mantiene el foco dentro de sus acciones.
  const manejarTecladoModal = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      cerrarModalExito()
      return
    }

    if (event.key !== 'Tab') return
    const botones = event.currentTarget.querySelectorAll('button:not(:disabled)')
    const primero = botones[0]
    const ultimo = botones[botones.length - 1]

    if (event.shiftKey && document.activeElement === primero) {
      event.preventDefault()
      ultimo?.focus()
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault()
      primero?.focus()
    }
  }

  const claseCampo = (nombre) => errores[nombre] ? 'field-control--error' : ''
  const tipoSeleccionadoActual = tiposEquipo.find((tipo) => String(tipo.id_tipo) === formulario.tipoEquipo)
  const tipoEquipoValido = Boolean(tipoSeleccionadoActual)
  const esTipoOtro = tipoSeleccionadoActual?.nombre.trim().toLowerCase() === 'otro'

  const campoTipoEquipo = (
    <div className={`equipment-field ${tipoEquipoValido ? '' : 'equipment-field--initial-type'}`}>
      <label htmlFor="tipo-equipo">Tipo de equipo <span>*</span></label>
      <SelectorTipoEquipo
        tipos={tiposEquipo}
        value={formulario.tipoEquipo}
        disabled={cargandoCatalogos}
        invalido={Boolean(errores.tipoEquipo)}
        onChange={(value) => cambiarCampo({ target: { name: 'tipoEquipo', value } })}
      />
      {errores.tipoEquipo && <small className="field-error">{errores.tipoEquipo}</small>}
      {!tipoEquipoValido && (
        <small className="equipment-type-help">Selecciona una opción para continuar con el registro</small>
      )}
    </div>
  )

  // ======================================================
  // RENDERIZADO DE LA PANTALLA
  // ======================================================

  return (
    <div className="dashboard">
      <Sidebar seccionActiva="Equipos" usuario={usuario} onInicio={onInicio} onNavigate={onNavigate} onLogout={cerrarSesion} />

      <main className="dashboard-main equipment-page">
        <section className="equipment-form-card equipment-form-card--progressive" aria-labelledby="equipment-form-title">
          <header className="equipment-form-header">
            <h1 id="equipment-form-title">Registrar equipo</h1>
          </header>

          {/* noValidate permite mostrar mensajes propios y mantener una experiencia consistente. */}
          <form className="equipment-form" onSubmit={enviarFormulario} noValidate>
            {tipoEquipoValido ? (
              <>
              {campoTipoEquipo}
            <div className="equipment-field">
              <label htmlFor="nombre-equipo">Nombre del equipo <span>*</span></label>
              <input id="nombre-equipo" name="nombreEquipo" type="text" maxLength="100" value={formulario.nombreEquipo} onChange={cambiarCampo} className={claseCampo('nombreEquipo')} aria-invalid={Boolean(errores.nombreEquipo)} />
              {errores.nombreEquipo && <small className="field-error">{errores.nombreEquipo}</small>}
            </div>
              <div className="equipment-field">
                <label htmlFor="codigo-interno">Código interno <span>*</span></label>
                <input id="codigo-interno" name="codigoInterno" type="text" maxLength="30" value={formulario.codigoInterno} onChange={cambiarCampo} className={claseCampo('codigoInterno')} aria-invalid={Boolean(errores.codigoInterno)} />
                {errores.codigoInterno && <small className="field-error">{errores.codigoInterno}</small>}
              </div>
            <div className="equipment-field">
              <label htmlFor="marca">Marca <span>*</span></label>
              <input id="marca" name="marca" type="text" maxLength="80" value={formulario.marca} onChange={cambiarCampo} className={claseCampo('marca')} aria-invalid={Boolean(errores.marca)} />
              {errores.marca && <small className="field-error">{errores.marca}</small>}
            </div>
            {/* El tipo personalizado aparece únicamente al seleccionar la opción "Otro" del catálogo. */}
            {esTipoOtro && (
              <div className="equipment-field">
                <label htmlFor="tipo-personalizado">Especificar tipo de equipo <span>*</span></label>
                <input id="tipo-personalizado" name="tipoPersonalizado" type="text" maxLength="80" value={formulario.tipoPersonalizado} onChange={cambiarCampo} className={claseCampo('tipoPersonalizado')} aria-invalid={Boolean(errores.tipoPersonalizado)} />
                {errores.tipoPersonalizado && <small className="field-error">{errores.tipoPersonalizado}</small>}
              </div>
            )}
            <div className="equipment-field">
              <label htmlFor="estado">Estado <span>*</span></label>
              <select id="estado" name="estado" value={formulario.estado} onChange={cambiarCampo} disabled={cargandoCatalogos} className={claseCampo('estado')} aria-invalid={Boolean(errores.estado)}>
                <option value="" disabled>Selecciona un estado</option>
                {/* Un equipo nuevo no puede comenzar con el estado Asignado. */}
                {estadosEquipo.filter((estado) => estado.nombre.trim().toLowerCase() !== 'asignado').map((estado) => (
                  <option value={estado.id_estado} key={estado.id_estado}>{estado.nombre}</option>
                ))}
              </select>
              {errores.estado && <small className="field-error">{errores.estado}</small>}
            </div>
            <div className="equipment-field">
              <label htmlFor="modelo">Modelo</label>
              <input id="modelo" name="modelo" type="text" maxLength="100" value={formulario.modelo} onChange={cambiarCampo} className={claseCampo('modelo')} aria-invalid={Boolean(errores.modelo)} />
              {errores.modelo && <small className="field-error">{errores.modelo}</small>}
            </div>
            <div className="equipment-field">
              <label htmlFor="numero-serie">Número de serie</label>
              <input id="numero-serie" name="numeroSerie" type="text" maxLength="100" value={formulario.numeroSerie} onChange={cambiarCampo} className={claseCampo('numeroSerie')} aria-invalid={Boolean(errores.numeroSerie)} />
              {errores.numeroSerie && <small className="field-error">{errores.numeroSerie}</small>}
            </div>
            <div className="equipment-field">
              <label htmlFor="mac-address">MAC Address</label>
              <input id="mac-address" name="macAddress" type="text" value={formulario.macAddress} onChange={cambiarCampo} className={claseCampo('macAddress')} aria-invalid={Boolean(errores.macAddress)} />
              {errores.macAddress && <small className="field-error">{errores.macAddress}</small>}
            </div>
            <div className="equipment-field">
              <label htmlFor="ip-interna">IP interna</label>
              <input id="ip-interna" name="ipInterna" type="text" value={formulario.ipInterna} onChange={cambiarCampo} className={claseCampo('ipInterna')} aria-invalid={Boolean(errores.ipInterna)} />
              {errores.ipInterna && <small className="field-error">{errores.ipInterna}</small>}
            </div>
            <div className="equipment-field">
              <label htmlFor="fecha-compra">Fecha de compra <span>*</span></label>
              <input id="fecha-compra" name="fechaCompra" type="date" max={hoy} value={formulario.fechaCompra} onChange={cambiarCampo} className={claseCampo('fechaCompra')} aria-invalid={Boolean(errores.fechaCompra)} />
              {errores.fechaCompra && <small className="field-error">{errores.fechaCompra}</small>}
            </div>
            <div className="equipment-field equipment-field--full">
              <label htmlFor="observaciones">Observaciones <span>*</span></label>
              <textarea id="observaciones" name="observaciones" rows="4" maxLength="500" value={formulario.observaciones} onChange={cambiarCampo} className={claseCampo('observaciones')} aria-invalid={Boolean(errores.observaciones)} />
              <small className="character-counter">{formulario.observaciones.length} / 500</small>
              {errores.observaciones && <small className="field-error">{errores.observaciones}</small>}
            </div>

            {mensajeRegistro && (
              <p
                className={`form-submit-message form-submit-message--${mensajeRegistro.tipo} equipment-field--full`}
                role={mensajeRegistro.tipo === 'error' ? 'alert' : 'status'}
              >
                {mensajeRegistro.texto}
              </p>
            )}

            <div className="equipment-actions equipment-field--full">
              <button className="secondary-button" type="button" onClick={onInicio}>Cancelar</button>
              <button ref={botonRegistrarRef} className="primary-button" type="submit" disabled={enviando}>
                {enviando ? 'Registrando equipo...' : 'Registrar equipo'}
              </button>
            </div>
              </>
            ) : (
              <>
                <p className="equipment-initial-instruction equipment-field--full">
                  Selecciona el tipo de equipo que deseas registrar
                </p>
                {campoTipoEquipo}
              </>
            )}
            {errorCatalogos && (
              <p className="catalog-error equipment-field--full" role="alert">
                No se pudieron cargar los datos del formulario
              </p>
            )}
          </form>
        </section>
      </main>

      {modalExitoAbierto && (
        <div className="confirmation-modal-backdrop">
          <section
            className="confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="equipment-success-title"
            aria-describedby="equipment-success-description"
            onKeyDown={manejarTecladoModal}
          >
            <span className="confirmation-modal-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
            </span>
            <h2 id="equipment-success-title">¡Equipo registrado!</h2>
            <p id="equipment-success-description">El equipo se ha guardado correctamente en el inventario.</p>
            <div className="confirmation-modal-actions">
              <button ref={botonAceptarRef} className="primary-button" type="button" onClick={cerrarModalExito}>Aceptar</button>
              <button className="secondary-button" type="button" onClick={irABuscarEquipos}>Ir a buscar equipos</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default RegistrarEquipo
