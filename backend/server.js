// ======================================================
// IMPORTACIÓN DE LIBRERÍAS
// ======================================================

// Express nos permite crear el servidor y las rutas de nuestra API.
const express = require('express');

// CORS permite que nuestro frontend pueda comunicarse con el backend.
const cors = require('cors');

// bcrypt sirve para comparar contraseñas de forma segura.
// Nunca compararemos ni guardaremos contraseñas como texto normal.
const bcrypt = require('bcrypt');

// jsonwebtoken nos permite crear un token cuando el usuario inicia sesión.
// Ese token servirá después para demostrar que el administrador está autenticado.
const jwt = require('jsonwebtoken');

// dotenv carga las variables privadas guardadas en el archivo .env.
// Ejemplo: contraseña de PostgreSQL y JWT_SECRET.
require('dotenv').config();


// ======================================================
// CONEXIÓN CON POSTGRESQL
// ======================================================

// Importamos la conexión que configuramos anteriormente en db.js.
const pool = require('./db');


// ======================================================
// CREACIÓN DEL SERVIDOR
// ======================================================

// Creamos nuestra aplicación usando Express.
const app = express();


// ======================================================
// MIDDLEWARES
// ======================================================

// Permitimos que el frontend pueda realizar peticiones al backend.
app.use(cors());

// Permite que Express pueda recibir información en formato JSON.
// Por ejemplo:
//
// {
//     "correo": "admin@empresa.com",
//     "password": "123456"
// }
app.use(express.json());


// ======================================================
// RUTA PRINCIPAL
// ======================================================

// Esta ruta sirve simplemente para comprobar
// que nuestra API está funcionando.
//
// GET http://localhost:3000/
app.get('/', (req, res) => {

    res.json({
        mensaje: 'API Inventario TI funcionando'
    });

});


// ======================================================
// PRUEBA DE CONEXIÓN CON POSTGRESQL
// ======================================================

// Esta ruta comprueba que Node.js realmente
// puede comunicarse con PostgreSQL.
//
// GET http://localhost:3000/api/test-db
app.get('/api/test-db', async (req, res) => {

    try {

        // Ejecutamos una consulta sencilla en PostgreSQL.
        // SELECT NOW() devuelve la fecha y hora del servidor.
        const resultado = await pool.query('SELECT NOW()');

        // Si PostgreSQL respondió correctamente,
        // enviamos una respuesta exitosa.
        res.json({
            mensaje: 'Conexión con PostgreSQL exitosa',
            fechaServidor: resultado.rows[0].now
        });

    } catch (error) {

        // Si ocurre un error, lo mostramos en la terminal.
        console.error(error);

        // También respondemos al cliente con código HTTP 500.
        res.status(500).json({
            mensaje: 'Error al conectar con PostgreSQL'
        });
    }

});


// ======================================================
// LOGIN DEL ADMINISTRADOR
// ======================================================

// Esta ruta recibirá el correo y contraseña
// enviados desde nuestra futura pantalla de Login.
//
// POST http://localhost:3000/api/auth/login
app.post('/api/auth/login', async (req, res) => {

    try {

        // Extraemos correo y password del JSON
        // enviado por el frontend.
        const { correo, password } = req.body;


        // --------------------------------------------------
        // 1. VALIDAR CAMPOS OBLIGATORIOS
        // --------------------------------------------------

        // Si falta el correo o la contraseña,
        // no dejamos continuar.
        if (!correo || !password) {

            return res.status(400).json({
                mensaje: 'Correo y contraseña son obligatorios'
            });

        }


        // --------------------------------------------------
        // 2. BUSCAR AL USUARIO EN POSTGRESQL
        // --------------------------------------------------

        // Buscamos un usuario cuyo correo coincida
        // con el correo ingresado en el Login.
        //
        // $1 es un parámetro de PostgreSQL.
        // Usarlo así también ayuda a evitar SQL Injection.
        const resultado = await pool.query(
            `SELECT
                id_usuario,
                nombre,
                correo,
                password_hash,
                rol,
                estado
             FROM usuarios
             WHERE correo = $1`,
            [correo]
        );


        // --------------------------------------------------
        // 3. COMPROBAR SI EL USUARIO EXISTE
        // --------------------------------------------------

        // Si PostgreSQL no encontró ninguna fila,
        // significa que ese correo no existe.
        if (resultado.rows.length === 0) {

            return res.status(401).json({
                mensaje: 'Credenciales incorrectas'
            });

        }


        // Guardamos los datos encontrados en una variable.
        const usuario = resultado.rows[0];


        // --------------------------------------------------
        // 4. COMPROBAR SI EL USUARIO ESTÁ ACTIVO
        // --------------------------------------------------

        // Nuestra tabla usuarios tiene el campo "estado".
        //
        // true  = usuario activo
        // false = usuario desactivado
        if (!usuario.estado) {

            return res.status(403).json({
                mensaje: 'Usuario inactivo'
            });

        }


        // --------------------------------------------------
        // 5. COMPROBAR LA CONTRASEÑA
        // --------------------------------------------------

        // La contraseña NO está guardada directamente
        // en PostgreSQL.
        //
        // PostgreSQL guarda password_hash.
        //
        // bcrypt.compare compara:
        //
        // contraseña ingresada
        //        VS
        // hash guardado en PostgreSQL
        const passwordCorrecta = await bcrypt.compare(
            password,
            usuario.password_hash
        );


        // Si la contraseña no coincide,
        // rechazamos el inicio de sesión.
        if (!passwordCorrecta) {

            return res.status(401).json({
                mensaje: 'Credenciales incorrectas'
            });

        }


        // --------------------------------------------------
        // 6. CREAR TOKEN DE AUTENTICACIÓN
        // --------------------------------------------------

        // Si llegamos hasta aquí significa:
        //
        // ✓ El correo existe
        // ✓ El usuario está activo
        // ✓ La contraseña es correcta
        //
        // Ahora generamos un JWT.
        const token = jwt.sign(

            // Información que guardaremos dentro del token.
            {
                id_usuario: usuario.id_usuario,
                correo: usuario.correo,
                rol: usuario.rol
            },

            // Clave secreta guardada en nuestro archivo .env.
            process.env.JWT_SECRET,

            // El token tendrá una duración máxima de 8 horas.
            {
                expiresIn: '8h'
            }

        );


        // --------------------------------------------------
        // 7. LOGIN EXITOSO
        // --------------------------------------------------

        // Finalmente respondemos al frontend.
        //
        // Importante:
        // NO enviamos password_hash.
        res.json({

            mensaje: 'Inicio de sesión exitoso',

            token: token,

            usuario: {
                id_usuario: usuario.id_usuario,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol
            }

        });


    } catch (error) {

        // --------------------------------------------------
        // ERROR INESPERADO
        // --------------------------------------------------

        // Si ocurre un problema inesperado con Node,
        // PostgreSQL, bcrypt, etc., llegará aquí.
        console.error('Error en login:', error);

        res.status(500).json({
            mensaje: 'Error interno del servidor'
        });

    }

});


// ======================================================
// PUERTO DEL SERVIDOR
// ======================================================

// Nuestro backend funcionará inicialmente en el puerto 3000.
const PORT = 3000;


// ======================================================
// INICIAR SERVIDOR
// ======================================================

// Aquí finalmente encendemos el servidor.
app.listen(PORT, () => {

    console.log(
        `Servidor ejecutándose en http://localhost:${PORT}`
    );

});