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
    volver: <><path d="m15 18-6-6 6-6" /><path d="M9 12h11" /></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{trazos[tipo]}</svg>
}

const opciones = [
  ['inicio', 'Inicio'], ['equipos', 'Equipos'], ['empleados', 'Empleados'],
  ['asignaciones', 'Asignaciones'], ['devoluciones', 'Devoluciones'],
  ['historial', 'Historial'], ['administradores', 'Administradores'],
]

function obtenerUsuario() {
  try { return JSON.parse(localStorage.getItem('usuario')) || {} } catch { return {} }
}

// Convierte la fecha SQL en una fecha local legible sin agregar una hora innecesaria.
function formatearFecha(valor) {
  if (!valor) return '-'
  const fecha = new Date(`${String(valor).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(fecha.getTime())) return '-'
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'long' }).format(fecha)
}

// ======================================================
// COMPONENTE DETALLE EMPLEADO
// ======================================================

function DetalleEmpleado({ idEmpleado, onInicio, onVolver, onLogout }) {
  const usuario = obtenerUsuario()
  const [empleado, setEmpleado] = useState(null)
  const [cargandoEmpleado, setCargandoEmpleado] = useState(true)
  const [errorEmpleado, setErrorEmpleado] = useState('')

  // Consulta únicamente el empleado seleccionado y cancela la petición al desmontarse.
  useEffect(() => {
    const controlador = new AbortController()

    const cargarEmpleado = async () => {
      const token = localStorage.getItem('token')
      try {
        const respuesta = await fetch(`http://localhost:3000/api/empleados/${idEmpleado}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controlador.signal,
        })

        if (respuesta.status === 404) {
          setErrorEmpleado('No se encontró el empleado solicitado.')
          return
        }
        if (respuesta.status === 401 || respuesta.status === 403) {
          setErrorEmpleado('La sesión expiró. Inicia sesión nuevamente.')
          return
        }
        if (!respuesta.ok) {
          setErrorEmpleado('No se pudo cargar el detalle del empleado.')
          return
        }

        setEmpleado(await respuesta.json())
        setErrorEmpleado('')
      } catch (error) {
        if (error.name !== 'AbortError') setErrorEmpleado('No se pudo conectar con el servidor.')
      } finally {
        if (!controlador.signal.aborted) setCargandoEmpleado(false)
      }
    }

    cargarEmpleado()
    return () => controlador.abort()
  }, [idEmpleado])

  const cerrarSesion = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    onLogout()
  }

  // El arreglo permite presentar todos los datos con la misma estructura visual.
  const campos = empleado ? [
    ['RUT', empleado.rut || '-'],
    ['Nombres', empleado.nombres || '-'],
    ['Apellidos', empleado.apellidos || '-'],
    ['Correo', empleado.correo || '-'],
    ['Teléfono', empleado.telefono || '-'],
    ['Área', empleado.area || '-'],
    ['Cargo', empleado.cargo || '-'],
    ['Fecha de ingreso', formatearFecha(empleado.fecha_ingreso)],
    ['Estado', empleado.estado ? 'Activo' : 'Inactivo'],
  ] : []

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

      <main className="dashboard-main detail-equipment-page">
        <section className="detail-equipment-card" aria-labelledby="detail-employee-title">
          <header className="detail-equipment-header">
            <div><h1 id="detail-employee-title">Detalle del empleado</h1>{empleado && <p>{empleado.rut}</p>}</div>
            <button className="secondary-button detail-back-button" type="button" onClick={onVolver}><Icono tipo="volver" />Volver</button>
          </header>

          {cargandoEmpleado && <div className="detail-equipment-status">Cargando empleado...</div>}
          {!cargandoEmpleado && errorEmpleado && <div className="detail-equipment-status detail-equipment-status--error" role="alert">{errorEmpleado}</div>}
          {!cargandoEmpleado && !errorEmpleado && empleado && (
            <dl className="detail-equipment-grid">
              {campos.map(([etiqueta, valor]) => <div className="detail-equipment-field" key={etiqueta}><dt>{etiqueta}</dt><dd>{valor}</dd></div>)}
            </dl>
          )}
        </section>
      </main>
    </div>
  )
}

export default DetalleEmpleado
