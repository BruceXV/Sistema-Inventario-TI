import { useState } from 'react'
import Login from './pages/Login.jsx'
import MenuPrincipal from './pages/MenuPrincipal.jsx'
import RegistrarEquipo from './pages/RegistrarEquipo.jsx'
import BuscarEquipos from './pages/BuscarEquipos.jsx'

function App() {
  const [autenticado, setAutenticado] = useState(() => Boolean(localStorage.getItem('token')))
  const [pantalla, setPantalla] = useState('inicio')

  const cerrarSesion = () => {
    setAutenticado(false)
    setPantalla('inicio')
  }

  if (!autenticado) {
    return <Login onLogin={() => setAutenticado(true)} />
  }

  if (pantalla === 'registrar-equipo') {
    return <RegistrarEquipo onInicio={() => setPantalla('inicio')} onLogout={cerrarSesion} />
  }

  if (pantalla === 'buscar-equipos') {
    return <BuscarEquipos onInicio={() => setPantalla('inicio')} onLogout={cerrarSesion} />
  }

  return (
    <MenuPrincipal
      onRegistrarEquipo={() => setPantalla('registrar-equipo')}
      onBuscarEquipos={() => setPantalla('buscar-equipos')}
      onLogout={cerrarSesion}
    />
  )
}

export default App
