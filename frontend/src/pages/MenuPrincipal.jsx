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
  ['inicio', 'Inicio'],
  ['equipos', 'Equipos'],
  ['empleados', 'Empleados'],
  ['asignaciones', 'Asignaciones'],
  ['devoluciones', 'Devoluciones'],
  ['historial', 'Historial'],
  ['administradores', 'Administradores'],
]

const tarjetas = [
  ['equipos', 'Registrar equipo', 'Agrega un nuevo equipo al inventario con sus detalles.'],
  ['buscar', 'Buscar equipos', 'Busca y consulta equipos por nombre, tipo, estado o número de serie.'],
  ['empleados', 'Registrar empleado', 'Registra nuevos empleados y gestiona su información en el sistema.'],
  ['asignaciones', 'Asignar equipo', 'Asigna un equipo a un empleado responsable y registra la asignación.'],
  ['devoluciones', 'Registrar devolución', 'Registra la devolución de un equipo y actualiza su estado en el inventario.'],
  ['historial', 'Consultar historial', 'Consulta el historial completo de asignaciones y devoluciones de equipos.'],
  ['administradores', 'Administradores', 'Gestiona los usuarios administradores con acceso al sistema.'],
]

function obtenerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario')) || {}
  } catch {
    return {}
  }
}

function MenuPrincipal({ onLogout }) {
  const usuario = obtenerUsuario()

  const cerrarSesion = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    onLogout()
  }

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

        <nav className="sidebar-nav" aria-label="Navegación principal">
          {opciones.map(([icono, texto], indice) => (
            <button className={indice === 0 ? 'active' : ''} type="button" key={texto}>
              <Icono tipo={icono} />
              <span>{texto}</span>
              {indice !== 0 && <span className="nav-arrow">›</span>}
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

      <main className="dashboard-main">
        <section className="shortcut-grid" aria-label="Accesos del sistema">
          {tarjetas.map(([icono, titulo, descripcion]) => (
            <button className="shortcut-card" type="button" key={titulo}>
              <span className="shortcut-icon"><Icono tipo={icono} /></span>
              <span className="shortcut-title">{titulo}<span aria-hidden="true">›</span></span>
              <span className="shortcut-description">{descripcion}</span>
            </button>
          ))}
        </section>
        <footer className="dashboard-footer">© Inventario TI. Todos los derechos reservados.</footer>
      </main>
    </div>
  )
}

export default MenuPrincipal
