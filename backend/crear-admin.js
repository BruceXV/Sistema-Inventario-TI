require('dotenv').config();

const bcrypt = require('bcrypt');
const pool = require('./db');

async function crearAdministrador() {
    try {
        const nombre = process.env.ADMIN_NOMBRE;
        const correo = process.env.ADMIN_CORREO;
        const password = process.env.ADMIN_PASSWORD;

        if (!nombre || !correo || !password) {
            console.log('Faltan los datos del administrador en el archivo .env');
            return;
        }

        const usuarioExistente = await pool.query(
            'SELECT id_usuario FROM usuarios WHERE correo = $1',
            [correo]
        );

        if (usuarioExistente.rows.length > 0) {
            console.log('Ya existe un administrador con ese correo');
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await pool.query(
            `INSERT INTO usuarios (nombre, correo, password_hash)
             VALUES ($1, $2, $3)`,
            [nombre, correo, passwordHash]
        );

        console.log('Administrador creado correctamente');
    } catch (error) {
        console.error('Error al crear administrador:', error.message);
    } finally {
        await pool.end();
    }
}

crearAdministrador();