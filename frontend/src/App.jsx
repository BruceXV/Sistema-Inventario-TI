import { useState } from 'react'
import Login from './pages/Login.jsx'
import MenuPrincipal from './pages/MenuPrincipal.jsx'
import RegistrarEquipo from './pages/RegistrarEquipo.jsx'

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

  return pantalla === 'registrar-equipo'
    ? <RegistrarEquipo onInicio={() => setPantalla('inicio')} onLogout={cerrarSesion} />
    : <MenuPrincipal onRegistrarEquipo={() => setPantalla('registrar-equipo')} onLogout={cerrarSesion} />
}

export default App
