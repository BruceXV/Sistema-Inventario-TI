// ======================================================
// COMPONENTES Y DATOS AUXILIARES
// ======================================================

const Icono = ({ tipo }) => {
  const trazos = {
    equipos: <><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>,
    monitor: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>,
    empleados: <><circle cx="9" cy="7" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2m1-15a3 3 0 0 1 0 6m2 2a5 5 0 0 1 3 5v2" /></>,
    buscarEmpleado: <><circle cx="9" cy="8" r="3" /><path d="M3 19a6 6 0 0 1 12 0" /><circle cx="18" cy="16" r="3" /><path d="m20.2 18.2 2.3 2.3" /></>,
    asignaciones: <><path d="M8.5 14.5 6 17a3.5 3.5 0 0 1-5-5l3.5-3.5a3.5 3.5 0 0 1 5 0" /><path d="m15.5 9.5 2.5-2.5a3.5 3.5 0 0 1 5 5l-3.5 3.5a3.5 3.5 0 0 1-5 0M8 16l8-8" /></>,
    devoluciones: <><path d="M9 7H4v5" /><path d="M5 11a8 8 0 1 1 2 7" /></>,
    historial: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6l-4 2" /></>,
    administradores: <><path d="M12 2 20 5v6c0 5-3.3 9-8 11-4.7-2-8-6-8-11V5l8-3Z" /><path d="m9 12 2 2 4-5" /></>,
    buscar: <><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6" /></>,
    calendario: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    salir: <><path d="M14 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-3m-4-4h11m-4-4 4 4-4 4" /></>,
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true">{trazos[tipo]}</svg>
}

// Cada tarjeta conserva el identificador exacto que App utiliza para renderizarla.
// Así ninguna navegación depende de la posición de la tarjeta dentro del arreglo.
const tarjetas = [
  { icono: 'equipos', titulo: 'Registrar equipo', descripcion: 'Agrega activos al inventario', pantalla: 'registrar-equipo', tono: 'azul' },
  { icono: 'buscar', titulo: 'Buscar equipos', descripcion: 'Consulta equipos registrados', pantalla: 'buscar-equipos', tono: 'indigo' },
  { icono: 'empleados', titulo: 'Registrar empleado', descripcion: 'Crea un nuevo perfil', pantalla: 'registrar-empleado', tono: 'turquesa' },
  { icono: 'buscarEmpleado', titulo: 'Buscar empleados', descripcion: 'Consulta el directorio', pantalla: 'buscar-empleados', tono: 'violeta' },
  { icono: 'asignaciones', titulo: 'Asignar equipo', descripcion: 'Entrega un equipo disponible', pantalla: 'asignar-equipo', tono: 'azul' },
  { icono: 'devoluciones', titulo: 'Registrar devolución', descripcion: 'Registra equipos devueltos', pantalla: 'registrar-devolucion', tono: 'indigo' },
  { icono: 'historial', titulo: 'Consultar historial', descripcion: 'Revisa todos los movimientos', pantalla: 'consultar-historial', tono: 'turquesa' },
  { icono: 'administradores', titulo: 'Administradores', descripcion: 'Gestiona accesos al sistema', pantalla: 'administradores', tono: 'violeta' },
]

function obtenerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario')) || {}
  } catch {
    return {}
  }
}

function obtenerIniciales(usuario) {
  const referencia = usuario.nombre?.trim() || usuario.correo?.split('@')[0] || ''
  return referencia.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((parte) => parte[0].toLocaleUpperCase('es-CL')).join('')
}

function obtenerSaludo(fecha) {
  const hora = fecha.getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatearFecha(fecha) {
  const texto = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(fecha)
  return texto.charAt(0).toLocaleUpperCase('es-CL') + texto.slice(1)
}

// ======================================================
// COMPONENTE MENÚ PRINCIPAL
// ======================================================

function MenuPrincipal({ onLogout, onNavigate }) {
  const usuario = obtenerUsuario()
  const ahora = new Date()
  const nombre = usuario.nombre?.trim() || ''
  const primerNombre = nombre.split(/\s+/).filter(Boolean)[0] || ''
  const iniciales = obtenerIniciales(usuario)

  const cerrarSesion = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    onLogout()
  }

  return (
    <div className="main-menu-page">
      <header className="main-menu-header">
        <div className="main-menu-header-inner">
          <div className="main-menu-brand">
            <span className="main-menu-logo"><Icono tipo="monitor" /></span>
            <div>
              <strong>Inventario TI</strong>
              <p>SISTEMA DE GESTIÓN</p>
            </div>
          </div>

          <div className="main-menu-account">
            <div className="main-menu-user">
              <span className="main-menu-avatar" aria-hidden="true">{iniciales}</span>
              <div>
                <strong>{nombre}</strong>
                <small>{usuario.rol || ''}</small>
              </div>
            </div>
            <button className="main-menu-logout" type="button" onClick={cerrarSesion}>
              <Icono tipo="salir" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <main className="main-menu-content">
        <section className="main-menu-welcome" aria-labelledby="main-menu-title">
          <div>
            <span className="main-menu-eyebrow">MENÚ PRINCIPAL</span>
            <h1 id="main-menu-title">{obtenerSaludo(ahora)}{primerNombre ? `, ${primerNombre}` : ''}</h1>
            <p>¿Qué deseas gestionar hoy?</p>
          </div>
          <div className="main-menu-date">
            <Icono tipo="calendario" />
            <time dateTime={ahora.toISOString().slice(0, 10)}>{formatearFecha(ahora)}</time>
          </div>
        </section>

        <section className="shortcut-grid" aria-label="Accesos del sistema">
          {tarjetas.map(({ icono, titulo, descripcion, pantalla, tono }) => (
            <button
              className={`shortcut-card shortcut-card--${tono}`}
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
