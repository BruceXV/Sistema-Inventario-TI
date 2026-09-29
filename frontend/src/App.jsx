import { useState } from 'react'
import Login from './pages/Login.jsx'
import MenuPrincipal from './pages/MenuPrincipal.jsx'
import RegistrarEquipo from './pages/RegistrarEquipo.jsx'
import BuscarEquipos from './pages/BuscarEquipos.jsx'
import DetalleEquipo from './pages/DetalleEquipo.jsx'
import RegistrarEmpleado from './pages/RegistrarEmpleado.jsx'
import BuscarEmpleados from './pages/BuscarEmpleados.jsx'
import DetalleEmpleado from './pages/DetalleEmpleado.jsx'

function App() {
  const [autenticado, setAutenticado] = useState(() => Boolean(localStorage.getItem('token')))
  const [pantalla, setPantalla] = useState('inicio')
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null)
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null)

  const cerrarSesion = () => {
    setAutenticado(false)
    setPantalla('inicio')
    setEquipoSeleccionado(null)
    setEmpleadoSeleccionado(null)
  }

  if (!autenticado) {
    return <Login onLogin={() => setAutenticado(true)} />
  }

  if (pantalla === 'registrar-equipo') {
    return <RegistrarEquipo onInicio={() => setPantalla('inicio')} onLogout={cerrarSesion} />
  }

  if (pantalla === 'buscar-equipos') {
    return (
      <BuscarEquipos
        onInicio={() => setPantalla('inicio')}
        onVerDetalle={(idEquipo) => {
          setEquipoSeleccionado(idEquipo)
          setPantalla('detalle-equipo')
        }}
        onLogout={cerrarSesion}
      />
    )
  }

  if (pantalla === 'detalle-equipo') {
    return (
      <DetalleEquipo
        idEquipo={equipoSeleccionado}
        onInicio={() => setPantalla('inicio')}
        onVolver={() => setPantalla('buscar-equipos')}
        onLogout={cerrarSesion}
      />
    )
  }

  if (pantalla === 'registrar-empleado') {
    return <RegistrarEmpleado onInicio={() => setPantalla('inicio')} onLogout={cerrarSesion} />
  }

  if (pantalla === 'buscar-empleados') {
    return (
      <BuscarEmpleados
        onInicio={() => setPantalla('inicio')}
        onVerDetalle={(idEmpleado) => {
          setEmpleadoSeleccionado(idEmpleado)
          setPantalla('detalle-empleado')
        }}
        onLogout={cerrarSesion}
      />
    )
  }

  if (pantalla === 'detalle-empleado') {
    return (
      <DetalleEmpleado
        idEmpleado={empleadoSeleccionado}
        onInicio={() => setPantalla('inicio')}
        onVolver={() => setPantalla('buscar-empleados')}
        onLogout={cerrarSesion}
      />
    )
  }

  return (
    <MenuPrincipal
      onRegistrarEquipo={() => setPantalla('registrar-equipo')}
      onBuscarEquipos={() => setPantalla('buscar-equipos')}
      onRegistrarEmpleado={() => setPantalla('registrar-empleado')}
      onBuscarEmpleados={() => setPantalla('buscar-empleados')}
      onLogout={cerrarSesion}
    />
  )
}

export default App
