// ======================================================
// IMPORTACIONES
// ======================================================

import { useEffect, useRef, useState } from 'react'

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
const filtrosIniciales = { buscar: '', idArea: '', estado: '' }

function obtenerUsuario() {
  try { return JSON.parse(localStorage.getItem('usuario')) || {} } catch { return {} }
}

function BuscarEmpleados({ onInicio, onLogout, onVerDetalle }) {
  const usuario = obtenerUsuario()
  const [empleados, setEmpleados] = useState([])
  const [areas, setAreas] = useState([])
  const [filtros, setFiltros] = useState(filtrosIniciales)
  const [cargandoEmpleados, setCargandoEmpleados] = useState(true)
  const [errorEmpleados, setErrorEmpleados] = useState('')
  const [errorAreas, setErrorAreas] = useState('')
  const controladorEmpleados = useRef(null)

  // Consulta el backend con los filtros actuales y cancela cualquier respuesta anterior.
  const cargarEmpleados = async (criterios = filtrosIniciales) => {
    controladorEmpleados.current?.abort()
    const controlador = new AbortController()
    controladorEmpleados.current = controlador
    const parametros = new URLSearchParams()
    if (criterios.buscar.trim()) parametros.set('buscar', criterios.buscar.trim())
    if (criterios.idArea) parametros.set('id_area', criterios.idArea)
    if (criterios.estado) parametros.set('estado', criterios.estado)

    const consulta = parametros.toString()
    const url = `http://localhost:3000/api/empleados${consulta ? `?${consulta}` : ''}`
    setCargandoEmpleados(true)
    setErrorEmpleados('')

    try {
      const respuesta = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        signal: controlador.signal,
      })
      if (respuesta.status === 401 || respuesta.status === 403) {
        setErrorEmpleados('La sesión expiró. Inicia sesión nuevamente.')
        return
      }
      if (!respuesta.ok) {
        setErrorEmpleados('No se pudieron cargar los empleados.')
        return
      }
      setEmpleados(await respuesta.json())
    } catch (error) {
      if (error.name !== 'AbortError') setErrorEmpleados('No se pudo conectar con el servidor.')
    } finally {
      if (!controlador.signal.aborted && controladorEmpleados.current === controlador) setCargandoEmpleados(false)
    }
  }

  useEffect(() => {
    cargarEmpleados(filtrosIniciales)
    return () => controladorEmpleados.current?.abort()
  }, [])

  // Carga las áreas activas para construir el selector del filtro.
  useEffect(() => {
    const controlador = new AbortController()
    const cargarAreas = async () => {
      try {
        const respuesta = await fetch('http://localhost:3000/api/areas', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          signal: controlador.signal,
        })
        if (respuesta.status === 401 || respuesta.status === 403) {
          setErrorAreas('La sesión expiró. Inicia sesión nuevamente.')
          return
        }
        if (!respuesta.ok) {
          setErrorAreas('No se pudieron cargar las áreas.')
          return
        }
        setAreas(await respuesta.json())
      } catch (error) {
        if (error.name !== 'AbortError') setErrorAreas('No se pudieron cargar las áreas.')
      }
    }
    cargarAreas()
    return () => controlador.abort()
  }, [])

  const buscarEmpleados = (event) => { event.preventDefault(); cargarEmpleados(filtros) }
  const limpiarFiltros = () => { setFiltros(filtrosIniciales); cargarEmpleados(filtrosIniciales) }
  const cambiarFiltro = (event) => {
    const { name, value } = event.target
    setFiltros((actuales) => ({ ...actuales, [name]: value }))
  }
  const cerrarSesion = () => {
    controladorEmpleados.current?.abort()
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    onLogout()
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="sidebar-logo"><Icono tipo="equipos" /></div><div><strong>Inventario TI</strong><p>Sistema de gestión de equipos de tecnología</p></div></div>
        <nav className="sidebar-nav" aria-label="Navegación principal">
          {opciones.map(([icono, texto]) => <button className={texto === 'Empleados' ? 'active' : ''} type="button" key={texto} onClick={texto === 'Inicio' ? onInicio : undefined}><Icono tipo={icono} /><span>{texto}</span>{texto !== 'Inicio' && <span className="nav-arrow">›</span>}</button>)}
        </nav>
        <div className="sidebar-account">
          <div className="account-info"><span className="account-avatar"><Icono tipo="administradores" /></span><div><strong>{usuario.nombre || 'Administrador'}</strong><small>{usuario.correo || ''}</small></div></div>
          <button className="logout-button" type="button" onClick={cerrarSesion}><Icono tipo="salir" />Cerrar sesión</button>
        </div>
      </aside>

      <main className="dashboard-main search-equipment-page">
        <div className="search-equipment-content">
          <header className="search-equipment-header"><h1>Buscar empleados</h1></header>
          <section className="equipment-filter-card" aria-label="Filtros de empleados">
            <form className="equipment-filters" onSubmit={buscarEmpleados}>
              <div className="search-filter-field search-filter-field--wide"><label htmlFor="buscar-empleado">Buscar</label><div className="search-input-control"><Icono tipo="buscar" /><input id="buscar-empleado" name="buscar" type="search" placeholder="RUT, nombres, apellidos o correo" value={filtros.buscar} onChange={cambiarFiltro} /></div></div>
              <div className="search-filter-field"><label htmlFor="area-empleado">Área</label><select id="area-empleado" name="idArea" value={filtros.idArea} onChange={cambiarFiltro}><option value="">Todas las áreas</option>{areas.map((area) => <option value={area.id_area} key={area.id_area}>{area.nombre}</option>)}</select></div>
              <div className="search-filter-field"><label htmlFor="estado-empleado">Estado</label><select id="estado-empleado" name="estado" value={filtros.estado} onChange={cambiarFiltro}><option value="">Todos</option><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></div>
              <div className="equipment-filter-actions"><button className="primary-button" type="submit">Buscar</button><button className="secondary-button" type="button" onClick={limpiarFiltros}>Limpiar filtros</button></div>
            </form>
            {errorAreas && <p className="filter-load-error" role="alert">{errorAreas}</p>}
          </section>

          <section className="equipment-table-card" aria-label="Listado de empleados">
            <div className="equipment-table-wrapper">
              <table className="equipment-table">
                <thead><tr><th>RUT</th><th>Nombre completo</th><th>Correo</th><th>Área</th><th>Cargo</th><th>Estado</th><th>Acción</th></tr></thead>
                <tbody>
                  {cargandoEmpleados && <tr><td className="equipment-empty-state" colSpan="7">Cargando empleados...</td></tr>}
                  {!cargandoEmpleados && errorEmpleados && <tr><td className="equipment-empty-state" colSpan="7">{errorEmpleados}</td></tr>}
                  {!cargandoEmpleados && !errorEmpleados && empleados.length === 0 && <tr><td className="equipment-empty-state" colSpan="7">No se encontraron empleados.</td></tr>}
                  {!cargandoEmpleados && !errorEmpleados && empleados.map((empleado) => <tr key={empleado.id_empleado}><td>{empleado.rut}</td><td>{`${empleado.nombres} ${empleado.apellidos}`}</td><td>{empleado.correo}</td><td>{empleado.area}</td><td>{empleado.cargo || '-'}</td><td>{empleado.estado ? 'Activo' : 'Inactivo'}</td><td><button className="table-detail-button" type="button" onClick={() => onVerDetalle?.(empleado.id_empleado)}>Ver detalle</button></td></tr>)}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default BuscarEmpleados
