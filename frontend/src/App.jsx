import { useState } from 'react'
import Login from './pages/Login.jsx'
import MenuPrincipal from './pages/MenuPrincipal.jsx'

function App() {
  const [autenticado, setAutenticado] = useState(() => Boolean(localStorage.getItem('token')))

  return autenticado
    ? <MenuPrincipal onLogout={() => setAutenticado(false)} />
    : <Login onLogin={() => setAutenticado(true)} />
}

export default App
