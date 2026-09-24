// ======================================================
// IMPORTACIONES
// ======================================================

// useEffect realiza la consulta inicial y useState conserva su resultado visible.
import { useEffect, useState } from 'react'

// ======================================================
// COMPONENTES Y DATOS AUXILIARES
// ======================================================

// Mantiene los mismos iconos SVG utilizados por las demás pantallas del sistema.
const Icono = ({ tipo }) => {
  const trazos = {
    inicio: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    equipos: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>,
    empleados: <><circle cx="9" cy="7" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2m1-15a3 3 0 0 1 0 6m2 2a5 5 0 0 1 3 5v2" /></>,
    asignaciones: <><path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4" /></>,
    devoluciones: <><path d="M4 7v6h6" /><path d="M5.5 13a8 8 0 1 0 2-7" /></>,
    historial: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" /></>,
    administradores: <><path d="M12 2 20 5v6c0 5-3.3 9-8 11-4.7-2-8-6-8-11V5l8-3Z" /><circle cx="12" cy="9" r="2.5" /><path d="M8 16a4 4 0 0 1 8 0" /></>,
    salir: <><path d="M14 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2-2v-3m-4-4h11m-4-4 4 4-4 4" /></>,
    volver: <><path d="m15 18-6-6 6-6" /><path d="M9 12h11" /></>,
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

// Recupera de forma segura el usuario autenticado guardado durante el Login.
function obtenerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario')) || {}
  } catch {
    return {}
  }
}

// Convierte fechas del backend a un formato legible respetando el día de las fechas SQL.
function formatearFecha(valor, incluirHora = false) {
  if (!valor) return '-'

  const fecha = incluirHora
    ? new Date(valor)
    : new Date(`${String(valor).slice(0, 10)}T00:00:00`)

  if (Number.isNaN(fecha.getTime())) return '-'

  return new Intl.DateTimeFormat('es-CL', incluirHora
    ? { dateStyle: 'long', timeStyle: 'short' }
    : { dateStyle: 'long' }).format(fecha)
}

// ======================================================
// COMPONENTE DETALLE EQUIPO
// ======================================================

function DetalleEquipo({ idEquipo, onInicio, onVolver, onLogout }) {
  const usuario = obtenerUsuario()
  const [equipo, setEquipo] = useState(null)
  const [cargandoEquipo, setCargandoEquipo] = useState(true)
  const [errorEquipo, setErrorEquipo] = useState('')

  // ======================================================
  // CARGA DEL DETALLE
  // ======================================================

  // Consulta exclusivamente el equipo elegido en Buscar Equipos.
  useEffect(() => {
    const controlador = new AbortController()

    const cargarEquipo = async () => {
      const token = localStorage.getItem('token')

      try {
        const respuesta = await fetch(`http://localhost:3000/api/equipos/${idEquipo}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controlador.signal,
        })

        if (respuesta.status === 404) {
          setErrorEquipo('No se encontró el equipo solicitado.')
          return
        }

        if (respuesta.status === 401 || respuesta.status === 403) {
          setErrorEquipo('La sesión expiró. Inicia sesión nuevamente.')
          return
        }

        if (!respuesta.ok) {
          setErrorEquipo('No se pudo cargar el detalle del equipo.')
          return
        }

        const data = await respuesta.json()
        setEquipo(data)
        setErrorEquipo('')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setErrorEquipo('No se pudo conectar con el servidor.')
        }
      } finally {
        if (!controlador.signal.aborted) {
          setCargandoEquipo(false)
        }
      }
    }

    cargarEquipo()

    // Evita actualizar estados si se vuelve a la lista antes de terminar la consulta.
    return () => controlador.abort()
  }, [idEquipo])

  // Elimina la sesión local y notifica a App para regresar al Login.
  const cerrarSesion = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    onLogout()
  }

  // Los campos se describen aquí para conservar un renderizado uniforme y legible.
  const campos = equipo ? [
    ['Código interno', equipo.codigo_interno],
    ['Nombre del equipo', equipo.nombre],
    ['Tipo de equipo', equipo.tipo_equipo],
    ['Estado', equipo.estado],
    ['Marca', equipo.marca],
    ['Modelo', equipo.modelo || '-'],
    ['Número de serie', equipo.serial || '-'],
    ['MAC Address', equipo.mac_address || '-'],
    ['IP interna', equipo.ip_interna || '-'],
    ['Fecha de compra', formatearFecha(equipo.fecha_compra)],
    ['Fecha de registro', formatearFecha(equipo.fecha_registro, true)],
    ['Observaciones', equipo.observaciones || '-'],
  ] : []

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

        {/* Detalle Equipo pertenece al módulo Equipos, por eso esa opción permanece activa. */}
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

      <main className="dashboard-main detail-equipment-page">
        <section className="detail-equipment-card" aria-labelledby="detail-equipment-title">
          <header className="detail-equipment-header">
            <div>
              <h1 id="detail-equipment-title">Detalle del equipo</h1>
              {equipo && <p>{equipo.codigo_interno}</p>}
            </div>
            <button className="secondary-button detail-back-button" type="button" onClick={onVolver}>
              <Icono tipo="volver" />
              Volver
            </button>
          </header>

          {cargandoEquipo && <div className="detail-equipment-status">Cargando equipo...</div>}
          {!cargandoEquipo && errorEquipo && <div className="detail-equipment-status detail-equipment-status--error" role="alert">{errorEquipo}</div>}
          {!cargandoEquipo && !errorEquipo && equipo && (
            <dl className="detail-equipment-grid">
              {campos.map(([etiqueta, valor]) => (
                <div className={etiqueta === 'Observaciones' ? 'detail-equipment-field detail-equipment-field--full' : 'detail-equipment-field'} key={etiqueta}>
                  <dt>{etiqueta}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </main>
    </div>
  )
}

export default DetalleEquipo
