// ======================================================
// IMPORTACIONES
// ======================================================

// useState conserva los equipos y mensajes; useEffect ejecuta la carga inicial.
import { useEffect, useState } from 'react'

// ======================================================
// COMPONENTES Y DATOS AUXILIARES
// ======================================================

// Reúne los iconos SVG usados por el sidebar y el buscador.
const Icono = ({ tipo }) => {
  const trazos = {
    inicio: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    equipos: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>,
    empleados: <><circle cx="9" cy="7" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2m1-15a3 3 0 0 1 0 6m2 2a5 5 0 0 1 3 5v2" /></>,
    asignaciones: <><path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4" /></>,
    devoluciones: <><path d="M4 7v6h6" /><path d="M5.5 13a8 8 0 1 0 2-7" /></>,
    historial: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" /></>,
    administradores: <><path d="M12 2 20 5v6c0 5-3.3 9-8 11-4.7-2-8-6-8-11V5l8-3Z" /><circle cx="12" cy="9" r="2.5" /><path d="M8 16a4 4 0 0 1 8 0" /></>,
    buscar: <><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6" /></>,
    salir: <><path d="M14 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2-2v-3m-4-4h11m-4-4 4 4-4 4" /></>,
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

// Lee los datos del usuario autenticado sin interrumpir la pantalla si el JSON no es válido.
function obtenerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario')) || {}
  } catch {
    return {}
  }
}

// ======================================================
// COMPONENTE BUSCAR EQUIPOS
// ======================================================

function BuscarEquipos({ onInicio, onLogout, onVerDetalle }) {
  const usuario = obtenerUsuario()

  // Separamos el inventario completo de los registros que muestra la tabla.
  // Así los filtros nunca eliminan ni vuelven a solicitar los datos originales.
  const [equiposOriginales, setEquiposOriginales] = useState([])
  const [equiposFiltrados, setEquiposFiltrados] = useState([])
  const [cargandoEquipos, setCargandoEquipos] = useState(true)
  const [errorEquipos, setErrorEquipos] = useState('')

  // Catálogos utilizados para construir las opciones reales de los selects.
  const [tiposEquipo, setTiposEquipo] = useState([])
  const [estadosEquipo, setEstadosEquipo] = useState([])
  const [errorFiltros, setErrorFiltros] = useState(false)

  // Valores controlados que el usuario selecciona antes de ejecutar la búsqueda.
  const [busqueda, setBusqueda] = useState('')
  const [tipoSeleccionado, setTipoSeleccionado] = useState('')
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('')
  const [filtrosAplicados, setFiltrosAplicados] = useState(false)

  // ======================================================
  // CARGA DE EQUIPOS
  // ======================================================

  // Consulta los equipos y catálogos una vez al abrir la pantalla.
  useEffect(() => {
    const controlador = new AbortController()

    const cargarEquipos = async () => {
      // El JWT demuestra al backend que el usuario inició sesión.
      const token = localStorage.getItem('token')

      try {
        const respuesta = await fetch('http://localhost:3000/api/equipos', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controlador.signal,
        })

        if (respuesta.status === 401) {
          setErrorEquipos('La sesión expiró. Inicia sesión nuevamente.')
          return
        }

        if (!respuesta.ok) {
          setErrorEquipos('No se pudieron cargar los equipos.')
          return
        }

        const data = await respuesta.json()
        setEquiposOriginales(data)
        setEquiposFiltrados(data)
        setErrorEquipos('')
      } catch (error) {
        // Una cancelación ocurre normalmente si el componente se desmonta durante la carga.
        if (error.name !== 'AbortError') {
          setErrorEquipos('No se pudo conectar con el servidor.')
        }
      } finally {
        if (!controlador.signal.aborted) {
          setCargandoEquipos(false)
        }
      }
    }

    // Los catálogos se cargan juntos porque ambos son necesarios para completar los filtros.
    const cargarCatalogos = async () => {
      try {
        const [respuestaTipos, respuestaEstados] = await Promise.all([
          fetch('http://localhost:3000/api/tipos-equipo', { signal: controlador.signal }),
          fetch('http://localhost:3000/api/estados-equipo', { signal: controlador.signal }),
        ])

        if (!respuestaTipos.ok || !respuestaEstados.ok) {
          setErrorFiltros(true)
          return
        }

        const [tipos, estados] = await Promise.all([
          respuestaTipos.json(),
          respuestaEstados.json(),
        ])

        setTiposEquipo(tipos)
        setEstadosEquipo(estados)
        setErrorFiltros(false)
      } catch (error) {
        if (error.name !== 'AbortError') {
          setErrorFiltros(true)
        }
      }
    }

    // Ambas tareas comienzan al mismo tiempo, pero conservan mensajes de error independientes.
    cargarEquipos()
    cargarCatalogos()

    // Cancela la petición para evitar actualizaciones después de abandonar la pantalla.
    return () => controlador.abort()
  }, [])

  // ======================================================
  // FILTROS DEL INVENTARIO
  // ======================================================

  // Combina texto, tipo y estado con lógica AND sobre los equipos ya cargados.
  const buscarEquipos = (event) => {
    event.preventDefault()
    const texto = busqueda.trim().toLowerCase()

    const resultados = equiposOriginales.filter((equipo) => {
      const camposDeTexto = [
        equipo.codigo_interno,
        equipo.nombre,
        equipo.marca,
        equipo.modelo,
        equipo.serial,
      ]
      const coincideTexto = !texto || camposDeTexto.some((campo) =>
        String(campo ?? '').toLowerCase().includes(texto),
      )
      const coincideTipo = !tipoSeleccionado || String(equipo.id_tipo) === tipoSeleccionado
      const coincideEstado = !estadoSeleccionado || String(equipo.id_estado) === estadoSeleccionado

      return coincideTexto && coincideTipo && coincideEstado
    })

    setEquiposFiltrados(resultados)
    setFiltrosAplicados(true)
  }

  // Restablece controles y tabla usando la copia original, sin consultar nuevamente la API.
  const limpiarFiltros = () => {
    setBusqueda('')
    setTipoSeleccionado('')
    setEstadoSeleccionado('')
    setEquiposFiltrados(equiposOriginales)
    setFiltrosAplicados(false)
  }

  // Cierra la sesión local y solicita a App que vuelva al Login.
  const cerrarSesion = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    onLogout()
  }

  // ======================================================
  // RENDERIZADO DE LA PANTALLA
  // ======================================================

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo"><Icono tipo="equipos" /></div>
          <div>
            <strong>Inventario TI</strong>
            <p>Sistema de gestión de equipos de tecnología</p>
          </div>
        </div>

        {/* Equipos se marca como opción activa; Inicio permite regresar al menú. */}
        <nav className="sidebar-nav" aria-label="Navegación principal">
          {opciones.map(([icono, texto]) => (
            <button
              className={texto === 'Equipos' ? 'active' : ''}
              type="button"
              key={texto}
              onClick={texto === 'Inicio' ? onInicio : undefined}
            >
              <Icono tipo={icono} />
              <span>{texto}</span>
              {texto !== 'Inicio' && <span className="nav-arrow">›</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-account">
          <div className="account-info">
            <span className="account-avatar"><Icono tipo="administradores" /></span>
            <div>
              <strong>{usuario.nombre || 'Administrador'}</strong>
              <small>{usuario.correo || ''}</small>
            </div>
          </div>
          <button className="logout-button" type="button" onClick={cerrarSesion}>
            <Icono tipo="salir" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="dashboard-main search-equipment-page">
        <div className="search-equipment-content">
          <header className="search-equipment-header">
            <h1>Buscar equipos</h1>
          </header>

          {/* Los filtros trabajan localmente sobre el arreglo obtenido durante la carga inicial. */}
          <section className="equipment-filter-card" aria-label="Filtros de equipos">
            <form className="equipment-filters" onSubmit={buscarEquipos}>
              <div className="search-filter-field search-filter-field--wide">
                <label htmlFor="busqueda-equipo">Buscar</label>
                <div className="search-input-control">
                  <Icono tipo="buscar" />
                  <input
                    id="busqueda-equipo"
                    type="search"
                    placeholder="Código, nombre, marca, modelo o serial"
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                  />
                </div>
              </div>

              <div className="search-filter-field">
                <label htmlFor="filtro-tipo">Tipo de equipo</label>
                <select id="filtro-tipo" value={tipoSeleccionado} onChange={(event) => setTipoSeleccionado(event.target.value)}>
                  <option value="">Todos los tipos</option>
                  {tiposEquipo.map((tipo) => (
                    <option value={tipo.id_tipo} key={tipo.id_tipo}>{tipo.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="search-filter-field">
                <label htmlFor="filtro-estado">Estado</label>
                <select id="filtro-estado" value={estadoSeleccionado} onChange={(event) => setEstadoSeleccionado(event.target.value)}>
                  <option value="">Todos los estados</option>
                  {estadosEquipo.map((estado) => (
                    <option value={estado.id_estado} key={estado.id_estado}>{estado.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="equipment-filter-actions">
                <button className="primary-button" type="submit">Buscar</button>
                <button className="secondary-button" type="button" onClick={limpiarFiltros}>Limpiar filtros</button>
              </div>
            </form>
            {errorFiltros && <p className="filter-load-error" role="alert">No se pudieron cargar los filtros.</p>}
          </section>

          {/* La tabla conserva sus columnas incluso cuando todavía no hay datos cargados. */}
          <section className="equipment-table-card" aria-label="Listado de equipos">
            <div className="equipment-table-wrapper">
              <table className="equipment-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Marca / Modelo</th>
                    <th>Número de serie</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {cargandoEquipos && (
                    <tr>
                      <td className="equipment-empty-state" colSpan="7">Cargando equipos...</td>
                    </tr>
                  )}
                  {!cargandoEquipos && errorEquipos && (
                    <tr>
                      <td className="equipment-empty-state" colSpan="7">{errorEquipos}</td>
                    </tr>
                  )}
                  {!cargandoEquipos && !errorEquipos && equiposOriginales.length === 0 && (
                    <tr>
                      <td className="equipment-empty-state" colSpan="7">No hay equipos para mostrar.</td>
                    </tr>
                  )}
                  {!cargandoEquipos && !errorEquipos && equiposOriginales.length > 0 && filtrosAplicados && equiposFiltrados.length === 0 && (
                    <tr>
                      <td className="equipment-empty-state" colSpan="7">No se encontraron equipos con los filtros seleccionados.</td>
                    </tr>
                  )}
                  {!cargandoEquipos && !errorEquipos && equiposFiltrados.map((equipo) => (
                    <tr key={equipo.id_equipo}>
                      <td>{equipo.codigo_interno}</td>
                      <td>{equipo.nombre}</td>
                      <td>{equipo.tipo_equipo}</td>
                      <td>{equipo.modelo ? `${equipo.marca} / ${equipo.modelo}` : equipo.marca}</td>
                      <td>{equipo.serial || '-'}</td>
                      <td>{equipo.estado}</td>
                      <td>
                        <button className="table-detail-button" type="button" onClick={() => onVerDetalle(equipo.id_equipo)}>
                          Ver detalle
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

export default BuscarEquipos
