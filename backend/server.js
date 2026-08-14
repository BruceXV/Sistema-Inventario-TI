// ======================================================
// IMPORTACIÓN DE LIBRERÍAS
// ======================================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();


// ======================================================
// CONEXIÓN CON POSTGRESQL
// ======================================================

const pool = require('./db');


// ======================================================
// CREAR APLICACIÓN EXPRESS
// ======================================================

const app = express();


// ======================================================
// MIDDLEWARES GENERALES
// ======================================================

app.use(cors());
app.use(express.json());


// ======================================================
// VERIFICAR TOKEN JWT
// ======================================================

function verificarToken(req, res, next) {

    const authorization = req.headers.authorization;

    if (
        !authorization ||
        !authorization.startsWith('Bearer ')
    ) {
        return res.status(401).json({
            mensaje: 'Acceso no autorizado'
        });
    }

    const token = authorization.split(' ')[1];

    try {

        const usuario = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.usuario = usuario;

        next();

    } catch (error) {

        return res.status(401).json({
            mensaje: 'Token inválido o expirado'
        });

    }
}


// ======================================================
// RUTA PRINCIPAL
// ======================================================

app.get('/', (req, res) => {

    res.json({
        mensaje: 'API Inventario TI funcionando'
    });

});


// ======================================================
// PRUEBA DE POSTGRESQL
// ======================================================

app.get('/api/test-db', async (req, res) => {

    try {

        const resultado = await pool.query(
            'SELECT NOW()'
        );

        res.json({
            mensaje: 'Conexión con PostgreSQL exitosa',
            fechaServidor: resultado.rows[0].now
        });

    } catch (error) {

        console.error(
            'Error de conexión con PostgreSQL:',
            error
        );

        res.status(500).json({
            mensaje: 'Error al conectar con PostgreSQL'
        });

    }
});


// ======================================================
// LOGIN
// ======================================================

app.post('/api/auth/login', async (req, res) => {

    try {

        const { correo, password } = req.body;


        // --------------------------------------------------
        // VALIDAR CAMPOS
        // --------------------------------------------------

        if (!correo || !password) {

            return res.status(400).json({
                mensaje: 'Correo y contraseña son obligatorios'
            });

        }


        // --------------------------------------------------
        // BUSCAR USUARIO
        // --------------------------------------------------

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
        // USUARIO NO EXISTE
        // --------------------------------------------------

        if (resultado.rows.length === 0) {

            return res.status(401).json({
                mensaje: 'Credenciales incorrectas'
            });

        }


        const usuario = resultado.rows[0];


        // --------------------------------------------------
        // USUARIO INACTIVO
        // --------------------------------------------------

        if (!usuario.estado) {

            return res.status(403).json({
                mensaje: 'Usuario inactivo'
            });

        }


        // --------------------------------------------------
        // COMPARAR CONTRASEÑA
        // --------------------------------------------------

        const passwordCorrecta = await bcrypt.compare(
            password,
            usuario.password_hash
        );


        if (!passwordCorrecta) {

            return res.status(401).json({
                mensaje: 'Credenciales incorrectas'
            });

        }


        // --------------------------------------------------
        // CREAR JWT
        // --------------------------------------------------

        const token = jwt.sign(
            {
                id_usuario: usuario.id_usuario,
                correo: usuario.correo,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '8h'
            }
        );


        // --------------------------------------------------
        // RESPUESTA
        // --------------------------------------------------

        res.json({

            mensaje: 'Inicio de sesión exitoso',

            token,

            usuario: {
                id_usuario: usuario.id_usuario,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol
            }

        });

    } catch (error) {

        console.error(
            'Error en login:',
            error
        );

        res.status(500).json({
            mensaje: 'Error interno del servidor'
        });

    }
});


// ======================================================
// OBTENER TIPOS DE EQUIPO
// ======================================================

app.get('/api/tipos-equipo', async (req, res) => {

    try {

        const resultado = await pool.query(
            `SELECT
                id_tipo,
                nombre
             FROM tipos_equipo
             WHERE estado = TRUE
             ORDER BY nombre ASC`
        );

        res.json(resultado.rows);

    } catch (error) {

        console.error(
            'Error al obtener tipos de equipo:',
            error
        );

        res.status(500).json({
            mensaje: 'Error al obtener los tipos de equipo'
        });

    }
});


// ======================================================
// OBTENER ESTADOS DE EQUIPO
// ======================================================

app.get('/api/estados-equipo', async (req, res) => {

    try {

        const resultado = await pool.query(
            `SELECT
                id_estado,
                nombre
             FROM estados_equipo
             WHERE estado = TRUE
             ORDER BY id_estado ASC`
        );

        res.json(resultado.rows);

    } catch (error) {

        console.error(
            'Error al obtener estados de equipo:',
            error
        );

        res.status(500).json({
            mensaje: 'Error al obtener los estados de equipo'
        });

    }
});


// ======================================================
// REGISTRAR EQUIPO
// ======================================================

app.post('/api/equipos', verificarToken, async (req, res) => {

    let cliente;

    try {

        // --------------------------------------------------
        // RECIBIR DATOS
        // --------------------------------------------------

        let {
            codigo_interno,
            nombre,
            id_tipo,
            tipo_personalizado,
            marca,
            modelo,
            serial,
            mac_address,
            ip_interna,
            fecha_compra,
            id_estado,
            observaciones
        } = req.body;


        // ==================================================
        // NORMALIZAR DATOS
        // ==================================================

        codigo_interno =
            typeof codigo_interno === 'string'
                ? codigo_interno.trim()
                : '';

        nombre =
            typeof nombre === 'string'
                ? nombre.trim()
                : '';

        marca =
            typeof marca === 'string'
                ? marca.trim()
                : '';

        tipo_personalizado =
            typeof tipo_personalizado === 'string'
                ? tipo_personalizado.trim()
                : null;

        modelo =
            typeof modelo === 'string' &&
            modelo.trim()
                ? modelo.trim()
                : null;

        serial =
            typeof serial === 'string' &&
            serial.trim()
                ? serial.trim()
                : null;

        mac_address =
            typeof mac_address === 'string' &&
            mac_address.trim()
                ? mac_address.trim()
                : null;

        ip_interna =
            typeof ip_interna === 'string' &&
            ip_interna.trim()
                ? ip_interna.trim()
                : null;

        fecha_compra =
            typeof fecha_compra === 'string' &&
            fecha_compra.trim()
                ? fecha_compra.trim()
                : null;

        observaciones =
            typeof observaciones === 'string'
                ? observaciones.trim()
                : '';


        const idTipoNumero = Number(id_tipo);
        const idEstadoNumero = Number(id_estado);


        // ==================================================
        // CAMPOS OBLIGATORIOS
        // ==================================================

        if (
            !codigo_interno ||
            !nombre ||
            !marca ||
            !fecha_compra ||
            !observaciones ||
            !Number.isInteger(idTipoNumero) ||
            !Number.isInteger(idEstadoNumero)
        ) {

            return res.status(400).json({
                mensaje: 'Faltan campos obligatorios'
            });

        }


        // ==================================================
        // CÓDIGO INTERNO
        // ==================================================

        const codigoRegex =
            /^[A-Za-z0-9_-]{2,30}$/;

        if (!codigoRegex.test(codigo_interno)) {

            return res.status(400).json({
                mensaje: 'Código interno inválido'
            });

        }


        // ==================================================
        // NOMBRE
        // ==================================================

        if (
            nombre.length < 2 ||
            nombre.length > 100
        ) {

            return res.status(400).json({
                mensaje: 'Nombre del equipo inválido'
            });

        }


        // ==================================================
        // MARCA
        // ==================================================

        if (
            marca.length < 2 ||
            marca.length > 80
        ) {

            return res.status(400).json({
                mensaje: 'Marca inválida'
            });

        }


        // ==================================================
        // MODELO
        // ==================================================

        if (
            modelo &&
            modelo.length > 100
        ) {

            return res.status(400).json({
                mensaje: 'Modelo inválido'
            });

        }


        // ==================================================
        // SERIAL
        // ==================================================

        if (
            serial &&
            serial.length > 100
        ) {

            return res.status(400).json({
                mensaje: 'Número de serie inválido'
            });

        }


        // ==================================================
        // MAC ADDRESS
        // ==================================================

        if (mac_address) {

            const macRegex =
                /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

            if (!macRegex.test(mac_address)) {

                return res.status(400).json({
                    mensaje: 'Dirección MAC inválida'
                });

            }

        }


        // ==================================================
        // IPv4
        // ==================================================

        if (ip_interna) {

            const partes = ip_interna.split('.');

            const ipValida =
                partes.length === 4 &&
                partes.every((parte) => {

                    if (!/^\d{1,3}$/.test(parte)) {
                        return false;
                    }

                    const numero = Number(parte);

                    return (
                        numero >= 0 &&
                        numero <= 255
                    );

                });


            if (!ipValida) {

                return res.status(400).json({
                    mensaje: 'Dirección IPv4 inválida'
                });

            }

        }


        // ==================================================
        // FECHA DE COMPRA OBLIGATORIA
        // ==================================================

        const fechaCompra =
            new Date(
                `${fecha_compra}T00:00:00`
            );

        const hoy = new Date();

        hoy.setHours(
            23,
            59,
            59,
            999
        );


        if (
            Number.isNaN(fechaCompra.getTime()) ||
            fechaCompra > hoy
        ) {

            return res.status(400).json({
                mensaje:
                    'La fecha de compra no puede ser futura'
            });

        }


        // ==================================================
        // OBSERVACIONES OBLIGATORIAS
        // ==================================================

        if (
            observaciones.length < 5 ||
            observaciones.length > 500
        ) {

            return res.status(400).json({
                mensaje:
                    'Las observaciones deben tener entre 5 y 500 caracteres'
            });

        }


        // ==================================================
        // INICIAR TRANSACCIÓN
        // ==================================================

        cliente = await pool.connect();

        await cliente.query('BEGIN');


        // ==================================================
        // COMPROBAR TIPO SELECCIONADO
        // ==================================================

        const tipoResultado =
            await cliente.query(
                `SELECT
                    id_tipo,
                    nombre,
                    estado
                 FROM tipos_equipo
                 WHERE id_tipo = $1
                   AND estado = TRUE`,
                [idTipoNumero]
            );


        if (
            tipoResultado.rows.length === 0
        ) {

            await cliente.query('ROLLBACK');

            return res.status(400).json({
                mensaje: 'Tipo de equipo inválido'
            });

        }


        const tipoSeleccionado =
            tipoResultado.rows[0];


        let idTipoFinal =
            tipoSeleccionado.id_tipo;


        // ==================================================
        // TIPO = "OTRO"
        // ==================================================

        if (
            tipoSeleccionado.nombre
                .trim()
                .toLowerCase() === 'otro'
        ) {

            // ----------------------------------------------
            // VALIDAR TIPO PERSONALIZADO
            // ----------------------------------------------

            if (
                !tipo_personalizado ||
                tipo_personalizado.length < 2 ||
                tipo_personalizado.length > 80
            ) {

                await cliente.query('ROLLBACK');

                return res.status(400).json({
                    mensaje:
                        'Ingresa un tipo de equipo válido'
                });

            }


            // ----------------------------------------------
            // NO PERMITIR "OTRO" COMO TEXTO PERSONALIZADO
            // ----------------------------------------------

            if (
                tipo_personalizado
                    .toLowerCase() === 'otro'
            ) {

                await cliente.query('ROLLBACK');

                return res.status(400).json({
                    mensaje:
                        'Especifica un tipo de equipo diferente'
                });

            }


            // ----------------------------------------------
            // BUSCAR SI EL TIPO YA EXISTE
            // ----------------------------------------------

            const tipoExistente =
                await cliente.query(
                    `SELECT
                        id_tipo,
                        nombre,
                        estado
                     FROM tipos_equipo
                     WHERE LOWER(TRIM(nombre))
                           = LOWER(TRIM($1))
                     LIMIT 1`,
                    [tipo_personalizado]
                );


            // ----------------------------------------------
            // SI YA EXISTE
            // ----------------------------------------------

            if (
                tipoExistente.rows.length > 0
            ) {

                const existente =
                    tipoExistente.rows[0];


                if (!existente.estado) {

                    await cliente.query('ROLLBACK');

                    return res.status(400).json({
                        mensaje:
                            'Ese tipo de equipo existe pero se encuentra inactivo'
                    });

                }


                // Reutilizamos el tipo existente.
                idTipoFinal =
                    existente.id_tipo;

            } else {

                // ------------------------------------------
                // CREAR NUEVO TIPO
                // ------------------------------------------

                const nuevoTipo =
                    await cliente.query(
                        `INSERT INTO tipos_equipo (
                            nombre,
                            descripcion,
                            estado
                        )
                        VALUES (
                            $1,
                            $2,
                            TRUE
                        )
                        RETURNING
                            id_tipo,
                            nombre`,
                        [
                            tipo_personalizado,
                            `Tipo agregado desde el registro de equipos: ${tipo_personalizado}`
                        ]
                    );


                idTipoFinal =
                    nuevoTipo.rows[0].id_tipo;

            }

        }


        // ==================================================
        // COMPROBAR ESTADO
        // ==================================================

        const estadoResultado =
            await cliente.query(
                `SELECT
                    id_estado,
                    nombre
                 FROM estados_equipo
                 WHERE id_estado = $1
                   AND estado = TRUE`,
                [idEstadoNumero]
            );


        if (
            estadoResultado.rows.length === 0
        ) {

            await cliente.query('ROLLBACK');

            return res.status(400).json({
                mensaje:
                    'Estado de equipo inválido'
            });

        }


        // ==================================================
        // NO PERMITIR "ASIGNADO"
        // ==================================================

        const nombreEstado =
            estadoResultado.rows[0].nombre
                .trim()
                .toLowerCase();


        if (nombreEstado === 'asignado') {

            await cliente.query('ROLLBACK');

            return res.status(400).json({
                mensaje:
                    'Un equipo nuevo no puede registrarse como Asignado'
            });

        }


        // ==================================================
        // INSERTAR EQUIPO
        // ==================================================

        const resultado =
            await cliente.query(
                `INSERT INTO equipos (
                    codigo_interno,
                    nombre,
                    id_tipo,
                    marca,
                    modelo,
                    serial,
                    mac_address,
                    ip_interna,
                    fecha_compra,
                    id_estado,
                    observaciones
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9,
                    $10,
                    $11
                )
                RETURNING
                    id_equipo,
                    codigo_interno,
                    nombre,
                    id_tipo,
                    marca,
                    modelo,
                    serial,
                    mac_address,
                    ip_interna,
                    fecha_compra,
                    id_estado,
                    observaciones,
                    fecha_registro`,
                [
                    codigo_interno,
                    nombre,
                    idTipoFinal,
                    marca,
                    modelo,
                    serial,
                    mac_address,
                    ip_interna,
                    fecha_compra,
                    idEstadoNumero,
                    observaciones
                ]
            );


        // ==================================================
        // CONFIRMAR TRANSACCIÓN
        // ==================================================

        await cliente.query('COMMIT');


        // ==================================================
        // RESPUESTA EXITOSA
        // ==================================================

        return res.status(201).json({

            mensaje:
                'Equipo registrado correctamente',

            equipo:
                resultado.rows[0]

        });


    } catch (error) {

        // ==================================================
        // DESHACER TRANSACCIÓN
        // ==================================================

        if (cliente) {

            try {
                await cliente.query('ROLLBACK');
            } catch {
                // No hacemos nada adicional.
            }

        }


        // ==================================================
        // CÓDIGO INTERNO O SERIAL REPETIDO
        // ==================================================

        if (error.code === '23505') {

            if (
                error.constraint ===
                'equipos_codigo_interno_key'
            ) {

                return res.status(409).json({
                    mensaje:
                        'Ya existe un equipo con ese código interno'
                });

            }


            if (
                error.constraint ===
                'equipos_serial_key'
            ) {

                return res.status(409).json({
                    mensaje:
                        'Ya existe un equipo con ese número de serie'
                });

            }


            return res.status(409).json({
                mensaje:
                    'Ya existe un registro con esos datos'
            });

        }


        // ==================================================
        // ERROR INESPERADO
        // ==================================================

        console.error(
            'Error al registrar equipo:',
            error
        );


        return res.status(500).json({
            mensaje:
                'Error interno al registrar el equipo'
        });


    } finally {

        // ==================================================
        // LIBERAR CONEXIÓN
        // ==================================================

        if (cliente) {
            cliente.release();
        }

    }

});


// ======================================================
// PUERTO
// ======================================================

const PORT = 3000;


// ======================================================
// INICIAR SERVIDOR
// ======================================================

app.listen(PORT, () => {

    console.log(
        `Servidor ejecutándose en http://localhost:${PORT}`
    );

});