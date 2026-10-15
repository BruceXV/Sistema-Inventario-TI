// ======================================================
// IMPORTACIONES
// ======================================================

import { useEffect, useRef, useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'

// ======================================================
// COMPONENTES Y DATOS AUXILIARES
// ======================================================

// Reutiliza los mismos iconos SVG del resto de las pantallas del sistema.
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
    salir: <><path d="M14 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-3m-4-4h11m-4-4 4 4-4 4" /></>,
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true">{trazos[tipo]}</svg>
}

const opciones = [
  ['inicio', 'Inicio'], ['equipos', 'Equipos'], ['empleados', 'Empleados'],
  ['asignaciones', 'Asignaciones'], ['devoluciones', 'Devoluciones'],
  ['historial', 'Historial'], ['administradores', 'Administradores'],
]

const filtrosIniciales = { buscar: '', estado: 'todas' }

function obtenerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario')) || {}
  } catch {
    return {}
  }
}

// Toma directamente el día de la fecha ISO para evitar que la zona horaria
// del navegador adelante o retroceda la fecha recibida desde PostgreSQL.
function formatearFecha(fecha) {
  if (!fecha) return '-'

  const partes = String(fecha).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return partes ? `${partes[3]}-${partes[2]}-${partes[1]}` : '-'
}

// ======================================================
// COMPONENTE CONSULTAR HISTORIAL
// ======================================================

function ConsultarHistorial({ onInicio, onNavigate, onLogout }) {
  const usuario = obtenerUsuario()
  const [historial, setHistorial] = useState([])
  const [filtros, setFiltros] = useState(filtrosIniciales)
  const [cargandoHistorial, setCargandoHistorial] = useState(true)
  const [errorHistorial, setErrorHistorial] = useState('')
  const controladorHistorial = useRef(null)

  // Consulta el historial con los filtros indicados. AbortController cancela
  // una petición anterior y evita que una respuesta antigua reemplace la actual.
  const cargarHistorial = async (criterios = filtrosIniciales) => {
    controladorHistorial.current?.abort()
    const controlador = new AbortController()
    controladorHistorial.current = controlador

    const parametros = new URLSearchParams()
    if (criterios.buscar.trim()) parametros.set('buscar', criterios.buscar.trim())
    if (criterios.estado !== 'todas') parametros.set('estado', criterios.estado)

    const consulta = parametros.toString()
    const url = `http://localhost:3000/api/historial${consulta ? `?${consulta}` : ''}`

    setCargandoHistorial(true)
    setErrorHistorial('')

    try {
      // El JWT demuestra al backend que el usuario inició sesión.
      const token = localStorage.getItem('token')
      const respuesta = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controlador.signal,
      })

      if (respuesta.status === 401 || respuesta.status === 403) {
        setErrorHistorial('La sesión expiró o no es válida. Inicia sesión nuevamente.')
        return
      }

      if (!respuesta.ok) {
        const data = await respuesta.json().catch(() => null)
        setErrorHistorial(data?.mensaje || 'No se pudo cargar el historial.')
        return
      }

      const registros = await respuesta.json()
      setHistorial(Array.isArray(registros) ? registros : [])
    } catch (error) {
      if (error.name !== 'AbortError') {
        setErrorHistorial('No se pudo conectar con el servidor.')
      }
    } finally {
      if (!controlador.signal.aborted && controladorHistorial.current === controlador) {
        setCargandoHistorial(false)
      }
    }
  }

  // Realiza la consulta inicial y la cancela si la pantalla se desmonta.
  useEffect(() => {
    cargarHistorial(filtrosIniciales)
    return () => controladorHistorial.current?.abort()
  }, [])

  const cambiarFiltro = (event) => {
    const { name, value } = event.target
    setFiltros((actuales) => ({ ...actuales, [name]: value }))
  }

  // El formulario permite buscar tanto con el botón como con la tecla Enter.
  const buscarHistorial = (event) => {
    event.preventDefault()
    if (!cargandoHistorial) cargarHistorial(filtros)
  }

  const limpiarFiltros = () => {
    if (cargandoHistorial) return
    setFiltros(filtrosIniciales)
    cargarHistorial(filtrosIniciales)
  }

  const cerrarSesion = () => {
    controladorHistorial.current?.abort()
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    onLogout()
  }

  // ======================================================
  // RENDERIZADO
  // ======================================================

  return (
    <div className="dashboard">
      <Sidebar seccionActiva="Historial" usuario={usuario} onInicio={onInicio} onNavigate={onNavigate} onLogout={cerrarSesion} />

      <main className="dashboard-main search-equipment-page">
        <div className="search-equipment-content">
          <header className="search-equipment-header"><h1>Consultar historial</h1></header>

          <section className="equipment-filter-card" aria-label="Filtros del historial">
            <form className="equipment-filters" onSubmit={buscarHistorial}>
              <div className="search-filter-field search-filter-field--wide">
                <label htmlFor="buscar-historial">Buscar</label>
                <div className="search-input-control">
                  <Icono tipo="buscar" />
                  <input id="buscar-historial" name="buscar" type="search" placeholder="Buscar por equipo o empleado" value={filtros.buscar} onChange={cambiarFiltro} />
                </div>
              </div>
              <div className="search-filter-field">
                <label htmlFor="estado-historial">Estado</label>
                <select id="estado-historial" name="estado" value={filtros.estado} onChange={cambiarFiltro}>
                  <option value="todas">Todas</option>
                  <option value="activa">Activa</option>
                  <option value="devuelta">Devuelta</option>
                </select>
              </div>
              <div className="equipment-filter-actions">
                <button className="primary-button" type="submit" disabled={cargandoHistorial}>Buscar</button>
                <button className="secondary-button" type="button" onClick={limpiarFiltros} disabled={cargandoHistorial}>Limpiar</button>
              </div>
            </form>
          </section>

          <section className="equipment-table-card" aria-label="Historial de asignaciones y devoluciones">
            <div className="equipment-table-wrapper">
              <table className="equipment-table history-table">
                <thead>
                  <tr><th>Código equipo</th><th>Equipo</th><th>Empleado</th><th>RUT</th><th>Fecha asignación</th><th>Fecha devolución</th><th>Condición</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {cargandoHistorial && <tr><td className="equipment-empty-state" colSpan="8">Cargando historial...</td></tr>}
                  {!cargandoHistorial && errorHistorial && <tr><td className="equipment-empty-state" colSpan="8">{errorHistorial}</td></tr>}
                  {!cargandoHistorial && !errorHistorial && historial.length === 0 && <tr><td className="equipment-empty-state" colSpan="8">No se encontraron registros en el historial.</td></tr>}
                  {!cargandoHistorial && !errorHistorial && historial.map((registro) => (
                    <tr key={registro.id_asignacion}>
                      <td>{registro.equipo?.codigo_interno || '-'}</td>
                      <td>{registro.equipo?.nombre || '-'}</td>
                      <td>{`${registro.empleado?.nombres || ''} ${registro.empleado?.apellidos || ''}`.trim() || '-'}</td>
                      <td>{registro.empleado?.rut || '-'}</td>
                      <td>{formatearFecha(registro.asignacion?.fecha)}</td>
                      <td>{formatearFecha(registro.devolucion?.fecha)}</td>
                      <td>{registro.devolucion?.condicion || '-'}</td>
                      <td>{registro.estado || '-'}</td>
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

export default ConsultarHistorial
