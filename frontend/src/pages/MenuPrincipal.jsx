// ======================================================
// COMPONENTES Y DATOS AUXILIARES
// ======================================================

// Centraliza los trazos SVG para mantener iconos simples y consistentes.
const Icono = ({ tipo }) => {
  const trazos = {
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

// Cada tarjeta incluye el identificador exacto que App utiliza para renderizarla.
// Así ninguna navegación depende de la posición de la tarjeta dentro del arreglo.
const tarjetas = [
  ['equipos', 'Registrar equipo', 'Agrega un nuevo equipo al inventario con sus detalles.', 'registrar-equipo'],
  ['buscar', 'Buscar equipos', 'Busca y consulta equipos por nombre, tipo, estado o número de serie.', 'buscar-equipos'],
  ['empleados', 'Registrar empleado', 'Registra nuevos empleados y gestiona su información en el sistema.', 'registrar-empleado'],
  ['buscar', 'Buscar empleados', 'Busca y consulta empleados por RUT, nombre, correo, área o estado.', 'buscar-empleados'],
  ['asignaciones', 'Asignar equipo', 'Asigna un equipo a un empleado responsable y registra la asignación.', 'asignar-equipo'],
  ['devoluciones', 'Registrar devolución', 'Registra la devolución de un equipo y actualiza su estado en el inventario.', 'registrar-devolucion'],
  ['historial', 'Consultar historial', 'Consulta el historial completo de asignaciones y devoluciones de equipos.', 'consultar-historial'],
  ['administradores', 'Administradores', 'Gestiona los usuarios administradores con acceso al sistema.', 'administradores'],
]

// Recupera de forma segura los datos básicos guardados después del Login.
function obtenerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario')) || {}
  } catch {
    return {}
  }
}

// ======================================================
// COMPONENTE MENÚ PRINCIPAL
// ======================================================

function MenuPrincipal({ onLogout, onNavigate }) {
  const usuario = obtenerUsuario()

  // Elimina la sesión local y avisa a App para volver inmediatamente al Login.
  const cerrarSesion = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    onLogout()
  }

  // ======================================================
  // RENDERIZADO DEL MENÚ
  // ======================================================

  return (
    <div className="main-menu-page">
      {/* Esta cabecera reemplaza el sidebar únicamente en el Menú Principal. */}
      <header className="main-menu-header">
        <div className="main-menu-brand">
          <span className="main-menu-logo"><Icono tipo="equipos" /></span>
          <div>
            <strong>Inventario TI</strong>
            <p>Sistema de gestión de equipos de tecnología</p>
          </div>
        </div>

        <div className="main-menu-account">
          <div className="main-menu-user">
            <span className="main-menu-avatar"><Icono tipo="administradores" /></span>
            <div>
              <strong>{usuario.nombre || 'Administrador'}</strong>
              <small>{usuario.correo || ''}</small>
            </div>
          </div>
          <button className="main-menu-logout" type="button" onClick={cerrarSesion}>
            <Icono tipo="salir" />
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="main-menu-content">
        <section className="shortcut-grid" aria-label="Accesos del sistema">
          {/* La tarjeta completa envía a App su identificador de pantalla. */}
          {tarjetas.map(([icono, titulo, descripcion, pantalla]) => (
            <button
              className="shortcut-card"
              type="button"
              key={pantalla}
              onClick={() => onNavigate(pantalla)}
            >
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
