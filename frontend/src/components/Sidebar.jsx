import { useState } from 'react'

// Mantiene en un solo lugar los iconos y destinos del menú lateral.
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

const opcionesDirectas = [
  ['asignaciones', 'Asignaciones', 'asignar-equipo'],
  ['devoluciones', 'Devoluciones', 'registrar-devolucion'],
  ['historial', 'Historial', 'consultar-historial'],
  ['administradores', 'Administradores', 'administradores'],
]

function Sidebar({ seccionActiva, usuario, onInicio, onNavigate, onLogout }) {
  const [submenuAbierto, setSubmenuAbierto] = useState(
    seccionActiva === 'Equipos' || seccionActiva === 'Empleados' ? seccionActiva : '',
  )

  const alternarSubmenu = (seccion) => {
    setSubmenuAbierto((actual) => actual === seccion ? '' : seccion)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo"><Icono tipo="equipos" /></div>
        <div>
          <strong>Inventario TI</strong>
          <p>Sistema de gestión de equipos de tecnología</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Navegación principal">
        <button className={seccionActiva === 'Inicio' ? 'active' : ''} type="button" onClick={onInicio}>
          <Icono tipo="inicio" /><span>Menú Principal</span>
        </button>

        <div className="sidebar-nav-group">
          <button className={seccionActiva === 'Equipos' ? 'active' : ''} type="button" aria-expanded={submenuAbierto === 'Equipos'} onClick={() => alternarSubmenu('Equipos')}>
            <Icono tipo="equipos" /><span>Equipos</span><span className={`nav-arrow ${submenuAbierto === 'Equipos' ? 'open' : ''}`}>›</span>
          </button>
          {submenuAbierto === 'Equipos' && (
            <div className="sidebar-submenu">
              <button type="button" onClick={() => onNavigate('registrar-equipo')}>Registrar equipo</button>
              <button type="button" onClick={() => onNavigate('buscar-equipos')}>Buscar equipos</button>
            </div>
          )}
        </div>

        <div className="sidebar-nav-group">
          <button className={seccionActiva === 'Empleados' ? 'active' : ''} type="button" aria-expanded={submenuAbierto === 'Empleados'} onClick={() => alternarSubmenu('Empleados')}>
            <Icono tipo="empleados" /><span>Empleados</span><span className={`nav-arrow ${submenuAbierto === 'Empleados' ? 'open' : ''}`}>›</span>
          </button>
          {submenuAbierto === 'Empleados' && (
            <div className="sidebar-submenu">
              <button type="button" onClick={() => onNavigate('registrar-empleado')}>Registrar empleado</button>
              <button type="button" onClick={() => onNavigate('buscar-empleados')}>Buscar empleados</button>
            </div>
          )}
        </div>

        {opcionesDirectas.map(([icono, texto, pantalla]) => (
          <button className={seccionActiva === texto ? 'active' : ''} type="button" key={pantalla} onClick={() => onNavigate(pantalla)}>
            <Icono tipo={icono} /><span>{texto}</span><span className="nav-arrow">›</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-account">
        <div className="account-info">
          <span className="account-avatar"><Icono tipo="administradores" /></span>
          <div><strong>{usuario.nombre || 'Administrador'}</strong><small>{usuario.correo || ''}</small></div>
        </div>
        <button className="logout-button" type="button" onClick={onLogout}><Icono tipo="salir" />Cerrar sesión</button>
      </div>
    </aside>
  )
}

export default Sidebar
