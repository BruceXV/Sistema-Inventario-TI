// ======================================================
// IMPORTACIONES
// ======================================================

// useState permite conservar los valores del formulario y el estado de la solicitud.
import { useState } from 'react'

// ======================================================
// COMPONENTE LOGIN
// ======================================================

function Login({ onLogin }) {
  // Controla la visibilidad de la contraseña sin cambiar su valor.
  const [mostrarPassword, setMostrarPassword] = useState(false)

  // Guardan las credenciales escritas por el usuario.
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')

  // Evita envíos simultáneos y permite informar el resultado dentro del formulario.
  const [procesando, setProcesando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  // ======================================================
  // AUTENTICACIÓN CON EL BACKEND
  // ======================================================

  // Envía las credenciales al endpoint de Login sin recargar la página.
  const iniciarSesion = async (event) => {
    event.preventDefault()

    if (procesando) return

    setProcesando(true)
    setMensaje(null)

    try {
      // El backend compara la contraseña y devuelve un JWT si las credenciales son válidas.
      const respuesta = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ correo, password }),
      })

      const data = await respuesta.json()

      if (!respuesta.ok) {
        // Traducimos las respuestas conocidas del backend a mensajes claros para el usuario.
        if (data.mensaje === 'Credenciales incorrectas') {
          setMensaje({ tipo: 'error', texto: 'Correo o contraseña incorrectos' })
        } else if (data.mensaje === 'Usuario inactivo') {
          setMensaje({ tipo: 'error', texto: 'Este usuario se encuentra inactivo' })
        } else {
          setMensaje({ tipo: 'error', texto: data.mensaje || 'No fue posible iniciar sesión' })
        }
        return
      }

      // Conservamos el JWT y los datos básicos para mantener la sesión entre recargas.
      // La contraseña nunca se guarda en localStorage.
      localStorage.setItem('token', data.token)
      localStorage.setItem('usuario', JSON.stringify(data.usuario))
      setMensaje({ tipo: 'exito', texto: 'Inicio de sesión exitoso' })

      // App recibe esta notificación y muestra inmediatamente el Menú Principal.
      onLogin?.(data.usuario)
    } catch {
      // fetch llega a este bloque cuando el servidor no está disponible o falla la red.
      setMensaje({ tipo: 'error', texto: 'No se pudo conectar con el servidor' })
    } finally {
      setProcesando(false)
    }
  }

  // ======================================================
  // INTERFAZ DEL LOGIN
  // ======================================================

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand" aria-hidden="true">
          <svg viewBox="0 0 96 96" role="img">
            <rect x="15" y="22" width="60" height="45" rx="6" />
            <path d="M38 76h20M43 67l-3 9m16-9 3 9" />
            <g className="brand-gear">
              <rect x="72" y="47" width="8" height="10" rx="2" />
              <rect x="72" y="75" width="8" height="10" rx="2" />
              <rect x="58" y="61" width="10" height="8" rx="2" />
              <rect x="84" y="61" width="10" height="8" rx="2" />
              <rect x="62" y="51" width="9" height="8" rx="2" transform="rotate(45 66.5 55)" />
              <rect x="81" y="70" width="9" height="8" rx="2" transform="rotate(45 85.5 74)" />
              <rect x="81" y="51" width="9" height="8" rx="2" transform="rotate(-45 85.5 55)" />
              <rect x="62" y="70" width="9" height="8" rx="2" transform="rotate(-45 66.5 74)" />
              <circle cx="76" cy="65" r="14" />
              <circle cx="76" cy="65" r="5" fill="#ffffff" stroke="none" />
            </g>
          </svg>
        </div>

        <header className="login-header">
          <h1 id="login-title">Inventario TI</h1>
          <span className="title-accent" aria-hidden="true" />
          <p>Sistema de gestión de equipos de tecnología</p>
        </header>

        {/* onSubmit permite iniciar sesión tanto con el botón como al presionar Enter. */}
        <form className="login-form" onSubmit={iniciarSesion}>
          <div className="form-field">
            <label htmlFor="correo">Correo electrónico</label>
            <div className="input-wrapper">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m4 7 8 6 8-6" />
              </svg>
              <input
                id="correo"
                name="correo"
                type="email"
                placeholder="ejemplo@empresa.com"
                autoComplete="email"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="password">Contraseña</label>
            <div className="input-wrapper">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="10" width="14" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
              </svg>
              <input
                id="password"
                name="password"
                type={mostrarPassword ? 'text' : 'password'}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={mostrarPassword}
                onClick={() => setMostrarPassword((visible) => !visible)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              </button>
            </div>
          </div>

          <button className="login-button" type="submit" disabled={procesando}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="10" width="14" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            {procesando ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>

          {/* Los resultados se muestran dentro de la tarjeta, sin usar alert(). */}
          {mensaje && (
            <p
              className={`login-message login-message--${mensaje.tipo}`}
              role={mensaje.tipo === 'error' ? 'alert' : 'status'}
            >
              {mensaje.texto}
            </p>
          )}
        </form>

        <aside className="admin-notice">
          <div className="shield-icon" aria-hidden="true">
            <svg viewBox="0 0 32 36">
              <path d="M16 2 29 7v9c0 8-5.5 14.7-13 18C8.5 30.7 3 24 3 16V7l13-5Z" />
              <rect x="11" y="15" width="10" height="9" rx="1.5" />
              <path d="M13 15v-2a3 3 0 0 1 6 0v2" />
            </svg>
          </div>
          <div>
            <strong>Acceso exclusivo para administradores</strong>
            <p>Mantén tus credenciales seguras.</p>
          </div>
        </aside>
      </section>

      <footer className="login-footer">© Inventario TI. Todos los derechos reservados.</footer>
    </main>
  )
}

export default Login
