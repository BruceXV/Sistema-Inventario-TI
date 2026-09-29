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
// ======================================================
// OBTENER / BUSCAR EQUIPOS
// ======================================================

// GET http://localhost:3000/api/equipos
//
// Esta ruta obtiene los equipos registrados.
// Está protegida con JWT, por lo que el usuario
// debe haber iniciado sesión.

app.get('/api/equipos', verificarToken, async (req, res) => {

    try {

        const resultado = await pool.query(
            `SELECT
                e.id_equipo,
                e.codigo_interno,
                e.nombre,
                e.id_tipo,
                t.nombre AS tipo_equipo,
                e.marca,
                e.modelo,
                e.serial,
                e.mac_address,
                e.ip_interna,
                e.fecha_compra,
                e.id_estado,
                es.nombre AS estado,
                e.observaciones,
                e.fecha_registro
             FROM equipos e
             INNER JOIN tipos_equipo t
                ON e.id_tipo = t.id_tipo
             INNER JOIN estados_equipo es
                ON e.id_estado = es.id_estado
             ORDER BY e.id_equipo DESC`
        );

        return res.json(resultado.rows);

    } catch (error) {

        console.error(
            'Error al obtener equipos:',
            error
        );

        return res.status(500).json({
            mensaje: 'Error interno al obtener los equipos'
        });

    }

});
// ======================================================
// OBTENER DETALLE DE UN EQUIPO
// ======================================================

// GET http://localhost:3000/api/equipos/:id
//
// Esta ruta obtiene todos los datos de un equipo
// específico utilizando su id_equipo.
// Está protegida con JWT.

app.get('/api/equipos/:id', verificarToken, async (req, res) => {

    try {

        // Obtener el ID enviado en la URL
        const idEquipo = Number(req.params.id);

        // Validar que el ID sea un número entero válido
        if (!Number.isInteger(idEquipo) || idEquipo <= 0) {

            return res.status(400).json({
                mensaje: 'ID de equipo inválido'
            });

        }

        // Buscar el equipo en PostgreSQL
        const resultado = await pool.query(
            `SELECT
                e.id_equipo,
                e.codigo_interno,
                e.nombre,
                e.id_tipo,
                t.nombre AS tipo_equipo,
                e.marca,
                e.modelo,
                e.serial,
                e.mac_address,
                e.ip_interna,
                e.fecha_compra,
                e.id_estado,
                es.nombre AS estado,
                e.observaciones,
                e.fecha_registro
             FROM equipos e
             INNER JOIN tipos_equipo t
                ON e.id_tipo = t.id_tipo
             INNER JOIN estados_equipo es
                ON e.id_estado = es.id_estado
             WHERE e.id_equipo = $1`,
            [idEquipo]
        );

        // Si no existe un equipo con ese ID
        if (resultado.rows.length === 0) {

            return res.status(404).json({
                mensaje: 'Equipo no encontrado'
            });

        }

        // Devolver todos los datos del equipo encontrado
        return res.json(resultado.rows[0]);

    } catch (error) {

        console.error(
            'Error al obtener detalle del equipo:',
            error
        );

        return res.status(500).json({
            mensaje: 'Error interno al obtener el equipo'
        });

    }

});
// ============================================================
// REGISTRAR EMPLEADO
// ============================================================

// POST http://localhost:3000/api/empleados
// Esta ruta permite registrar un nuevo empleado en el sistema.
// Está protegida con JWT, por lo que el usuario debe haber
// iniciado sesión.

// ============================================================
// REGISTRAR EMPLEADO
// ============================================================

// POST http://localhost:3000/api/empleados
// Esta ruta permite registrar un nuevo empleado en el sistema.
// Está protegida con JWT.

app.post('/api/empleados', verificarToken, async (req, res) => {

    try {

        // --------------------------------------------------
        // RECIBIR DATOS
        // --------------------------------------------------

        const {
            rut,
            nombres,
            apellidos,
            correo,
            telefono,
            id_area,
            cargo,
            fecha_ingreso
        } = req.body;


        // --------------------------------------------------
        // VALIDAR CAMPOS OBLIGATORIOS
        // --------------------------------------------------

        if (
            !rut ||
            !nombres ||
            !apellidos ||
            !correo ||
            !id_area
        ) {

            return res.status(400).json({
                mensaje:
                    'RUT, nombres, apellidos, correo y área son obligatorios'
            });

        }


        // --------------------------------------------------
        // REGISTRAR EMPLEADO EN POSTGRESQL
        // --------------------------------------------------

        const resultado = await pool.query(
            `INSERT INTO empleados (
                rut,
                nombres,
                apellidos,
                correo,
                telefono,
                id_area,
                cargo,
                fecha_ingreso
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8
            )
            RETURNING
                id_empleado,
                rut,
                nombres,
                apellidos,
                correo,
                telefono,
                id_area,
                cargo,
                fecha_ingreso,
                estado`,
            [
                rut,
                nombres,
                apellidos,
                correo,
                telefono || null,
                id_area,
                cargo || null,
                fecha_ingreso || null
            ]
        );


        // --------------------------------------------------
        // RESPUESTA EXITOSA
        // --------------------------------------------------

        return res.status(201).json({

            mensaje:
                'Empleado registrado correctamente',

            empleado:
                resultado.rows[0]

        });


    } catch (error) {

        // --------------------------------------------------
        // RUT O CORREO DUPLICADO
        // --------------------------------------------------

        if (error.code === '23505') {

            if (
                error.constraint ===
                'empleados_rut_key'
            ) {

                return res.status(409).json({
                    mensaje:
                        'Ya existe un empleado con ese RUT'
                });

            }


            if (
                error.constraint ===
                'empleados_correo_key'
            ) {

                return res.status(409).json({
                    mensaje:
                        'Ya existe un empleado con ese correo'
                });

            }

        }


        // --------------------------------------------------
        // ÁREA NO EXISTE
        // --------------------------------------------------

        if (error.code === '23503') {

            return res.status(400).json({
                mensaje:
                    'El área seleccionada no existe'
            });

        }


        // --------------------------------------------------
        // ERROR INESPERADO
        // --------------------------------------------------

        console.error(
            'Error al registrar empleado:',
            error
        );

        return res.status(500).json({
            mensaje:
                'Error interno al registrar el empleado'
        });

    }

});
// ============================================================
// OBTENER ÁREAS
// ============================================================

// GET http://localhost:3000/api/areas
// Obtiene las áreas activas registradas en la base de datos.
// Esta información se utilizará en el formulario
// para registrar empleados.

app.get('/api/areas', verificarToken, async (req, res) => {

    try {

        // Obtener las áreas activas
        const resultado = await pool.query(
            `SELECT
                id_area,
                nombre
             FROM areas
             WHERE estado = true
             ORDER BY nombre ASC`
        );

        // Devolver las áreas encontradas
        return res.json(resultado.rows);

    } catch (error) {

        console.error(
            'Error al obtener áreas:',
            error
        );

        return res.status(500).json({
            mensaje: 'Error interno al obtener las áreas'
        });

    }

});

// ============================================================
// BUSCAR / LISTAR EMPLEADOS
// ============================================================

// GET http://localhost:3000/api/empleados
// Esta ruta permite obtener la lista de empleados registrados.
// También permite buscar y filtrar por área y estado.
// Está protegida con JWT.

app.get('/api/empleados', verificarToken, async (req, res) => {

    try {

        // Obtener filtros enviados desde la URL
        const {
            buscar,
            id_area,
            estado
        } = req.query;


        // ====================================================
        // CONSULTA BASE
        // ====================================================

        let consulta = `
            SELECT
                e.id_empleado,
                e.rut,
                e.nombres,
                e.apellidos,
                e.correo,
                e.telefono,
                e.id_area,
                a.nombre AS area,
                e.cargo,
                e.fecha_ingreso,
                e.estado
            FROM empleados e
            INNER JOIN areas a
                ON e.id_area = a.id_area
            WHERE 1 = 1
        `;


        // Valores que se enviarán de forma segura a PostgreSQL
        const valores = [];

        let numeroParametro = 1;


        // ====================================================
        // FILTRO DE BÚSQUEDA
        // ====================================================

        // Permite buscar por:
        // RUT
        // nombres
        // apellidos
        // correo

        if (buscar && buscar.trim() !== '') {

            consulta += `
                AND (
                    e.rut ILIKE $${numeroParametro}
                    OR e.nombres ILIKE $${numeroParametro}
                    OR e.apellidos ILIKE $${numeroParametro}
                    OR e.correo ILIKE $${numeroParametro}
                    OR CONCAT(
                        e.nombres,
                        ' ',
                        e.apellidos
                    ) ILIKE $${numeroParametro}
                )
            `;

            valores.push(
                `%${buscar.trim()}%`
            );

            numeroParametro++;

        }


        // ====================================================
        // FILTRO POR ÁREA
        // ====================================================

        if (
            id_area &&
            id_area !== '' &&
            id_area !== 'todos'
        ) {

            const areaNumero = Number(id_area);


            // Validar que el ID sea un número entero válido
            if (
                !Number.isInteger(areaNumero) ||
                areaNumero <= 0
            ) {

                return res.status(400).json({
                    mensaje: 'El área seleccionada no es válida'
                });

            }


            consulta += `
                AND e.id_area = $${numeroParametro}
            `;

            valores.push(areaNumero);

            numeroParametro++;

        }


        // ====================================================
        // FILTRO POR ESTADO
        // ====================================================

        if (
            estado !== undefined &&
            estado !== '' &&
            estado !== 'todos'
        ) {

            let estadoBooleano;


            if (
                estado === 'true' ||
                estado === 'activo'
            ) {

                estadoBooleano = true;

            } else if (
                estado === 'false' ||
                estado === 'inactivo'
            ) {

                estadoBooleano = false;

            } else {

                return res.status(400).json({
                    mensaje: 'El estado seleccionado no es válido'
                });

            }


            consulta += `
                AND e.estado = $${numeroParametro}
            `;

            valores.push(estadoBooleano);

            numeroParametro++;

        }


        // ====================================================
        // ORDENAR RESULTADOS
        // ====================================================

        consulta += `
            ORDER BY
                e.nombres ASC,
                e.apellidos ASC,
                e.id_empleado ASC
        `;


        // ====================================================
        // EJECUTAR CONSULTA
        // ====================================================

        const resultado = await pool.query(
            consulta,
            valores
        );


        // ====================================================
        // DEVOLVER RESULTADOS
        // ====================================================

        return res.json(resultado.rows);


    } catch (error) {

        console.error(
            'Error al obtener empleados:',
            error
        );


        return res.status(500).json({
            mensaje: 'Error interno al obtener los empleados'
        });

    }

});

// ============================================================
// OBTENER DETALLE DE UN EMPLEADO
// ============================================================

// GET http://localhost:3000/api/empleados/:id
// Esta ruta permite obtener todos los datos de un empleado
// específico utilizando su ID.
// Está protegida con JWT.

app.get('/api/empleados/:id', verificarToken, async (req, res) => {

    try {

        // Obtener el ID del empleado desde la URL
        const { id } = req.params;

        // Convertir el ID recibido a número
        const idEmpleado = Number(id);


        // ====================================================
        // VALIDAR ID
        // ====================================================

        // El ID debe ser un número entero mayor que 0
        if (
            !Number.isInteger(idEmpleado) ||
            idEmpleado <= 0
        ) {

            return res.status(400).json({
                mensaje: 'El ID del empleado no es válido'
            });

        }


        // ====================================================
        // BUSCAR EMPLEADO
        // ====================================================

        const resultado = await pool.query(
            `
            SELECT
                e.id_empleado,
                e.rut,
                e.nombres,
                e.apellidos,
                e.correo,
                e.telefono,
                e.id_area,
                a.nombre AS area,
                e.cargo,
                e.fecha_ingreso,
                e.estado
            FROM empleados e
            INNER JOIN areas a
                ON e.id_area = a.id_area
            WHERE e.id_empleado = $1
            `,
            [idEmpleado]
        );


        // ====================================================
        // EMPLEADO NO ENCONTRADO
        // ====================================================

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                mensaje: 'Empleado no encontrado'
            });

        }


        // ====================================================
        // DEVOLVER EMPLEADO
        // ====================================================

        return res.json(resultado.rows[0]);


    } catch (error) {

        console.error(
            'Error al obtener detalle del empleado:',
            error
        );


        return res.status(500).json({
            mensaje: 'Error interno al obtener el empleado'
        });

    }

});

// ============================================================
// REGISTRAR ASIGNACIÓN DE EQUIPO
// ============================================================

// POST http://localhost:3000/api/asignaciones
// Permite asignar un equipo disponible a un empleado activo.
// La asignación y el cambio de estado del equipo se realizan
// dentro de una transacción para evitar datos inconsistentes.
// Está protegida mediante JWT.

app.post('/api/asignaciones', verificarToken, async (req, res) => {

    // Obtener los datos enviados desde el formulario
    const {
        id_equipo,
        id_empleado,
        fecha_asignacion,
        observaciones
    } = req.body;


    // ========================================================
    // VALIDAR CAMPOS OBLIGATORIOS
    // ========================================================

    if (
        id_equipo === undefined ||
        id_equipo === null ||
        id_equipo === ''
    ) {
        return res.status(400).json({
            mensaje: 'El equipo es obligatorio'
        });
    }


    if (
        id_empleado === undefined ||
        id_empleado === null ||
        id_empleado === ''
    ) {
        return res.status(400).json({
            mensaje: 'El empleado es obligatorio'
        });
    }


    if (
        fecha_asignacion === undefined ||
        fecha_asignacion === null ||
        String(fecha_asignacion).trim() === ''
    ) {
        return res.status(400).json({
            mensaje: 'La fecha de asignación es obligatoria'
        });
    }


    if (
        observaciones === undefined ||
        observaciones === null ||
        String(observaciones).trim() === ''
    ) {
        return res.status(400).json({
            mensaje: 'Las observaciones son obligatorias'
        });
    }


    // ========================================================
    // VALIDAR IDs
    // ========================================================

    const idEquipo = Number(id_equipo);
    const idEmpleado = Number(id_empleado);


    if (
        !Number.isInteger(idEquipo) ||
        idEquipo <= 0
    ) {
        return res.status(400).json({
            mensaje: 'El equipo seleccionado no es válido'
        });
    }


    if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
    ) {
        return res.status(400).json({
            mensaje: 'El empleado seleccionado no es válido'
        });
    }


    // ========================================================
    // VALIDAR FECHA DE ASIGNACIÓN
    // ========================================================

    const fechaTexto = String(fecha_asignacion).trim();

    // La fecha debe llegar en formato YYYY-MM-DD
    const formatoFecha = /^\d{4}-\d{2}-\d{2}$/;


    if (!formatoFecha.test(fechaTexto)) {
        return res.status(400).json({
            mensaje: 'La fecha de asignación no es válida'
        });
    }


    const [anio, mes, dia] = fechaTexto
        .split('-')
        .map(Number);


    const fechaValidacion = new Date(
        anio,
        mes - 1,
        dia
    );


    // Comprobar que la fecha realmente exista
    if (
        fechaValidacion.getFullYear() !== anio ||
        fechaValidacion.getMonth() !== mes - 1 ||
        fechaValidacion.getDate() !== dia
    ) {
        return res.status(400).json({
            mensaje: 'La fecha de asignación no es válida'
        });
    }


    // No permitir fechas futuras
    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);
    fechaValidacion.setHours(0, 0, 0, 0);


    if (fechaValidacion > hoy) {
        return res.status(400).json({
            mensaje: 'La fecha de asignación no puede ser futura'
        });
    }


    // ========================================================
    // NORMALIZAR OBSERVACIONES
    // ========================================================

    const observacionesNormalizadas =
        String(observaciones).trim();


    // ========================================================
    // INICIAR TRANSACCIÓN
    // ========================================================

    const cliente = await pool.connect();

    try {

        await cliente.query('BEGIN');


        // ====================================================
        // BUSCAR Y BLOQUEAR EL EQUIPO
        // ====================================================

        const resultadoEquipo = await cliente.query(
            `
            SELECT
                id_equipo,
                codigo_interno,
                nombre,
                id_estado
            FROM equipos
            WHERE id_equipo = $1
            FOR UPDATE
            `,
            [idEquipo]
        );


        // ====================================================
        // VALIDAR EXISTENCIA DEL EQUIPO
        // ====================================================

        if (resultadoEquipo.rows.length === 0) {

            await cliente.query('ROLLBACK');

            return res.status(404).json({
                mensaje: 'Equipo no encontrado'
            });
        }


        const equipo = resultadoEquipo.rows[0];


        // ====================================================
        // VALIDAR DISPONIBILIDAD DEL EQUIPO
        // ====================================================

        // Estados actuales:
        // 1 = Disponible
        // 2 = Asignado
        // 3 = En reparación
        // 4 = Dado de baja

        if (equipo.id_estado !== 1) {

            await cliente.query('ROLLBACK');

            return res.status(409).json({
                mensaje: 'El equipo seleccionado no está disponible'
            });
        }


        // ====================================================
        // BUSCAR EMPLEADO
        // ====================================================

        const resultadoEmpleado = await cliente.query(
            `
            SELECT
                id_empleado,
                rut,
                nombres,
                apellidos,
                estado
            FROM empleados
            WHERE id_empleado = $1
            `,
            [idEmpleado]
        );


        // ====================================================
        // VALIDAR EXISTENCIA DEL EMPLEADO
        // ====================================================

        if (resultadoEmpleado.rows.length === 0) {

            await cliente.query('ROLLBACK');

            return res.status(404).json({
                mensaje: 'Empleado no encontrado'
            });
        }


        const empleado = resultadoEmpleado.rows[0];


        // ====================================================
        // VALIDAR QUE EL EMPLEADO ESTÉ ACTIVO
        // ====================================================

        if (empleado.estado !== true) {

            await cliente.query('ROLLBACK');

            return res.status(409).json({
                mensaje: 'No se puede asignar un equipo a un empleado inactivo'
            });
        }


        // ====================================================
        // REGISTRAR ASIGNACIÓN
        // ====================================================

        const resultadoAsignacion = await cliente.query(
            `
            INSERT INTO asignaciones (
                id_equipo,
                id_empleado,
                fecha_asignacion,
                observaciones
            )
            VALUES (
                $1,
                $2,
                $3::timestamp,
                $4
            )
            RETURNING
                id_asignacion,
                id_equipo,
                id_empleado,
                fecha_asignacion,
                observaciones
            `,
            [
                idEquipo,
                idEmpleado,
                fechaTexto,
                observacionesNormalizadas
            ]
        );


        // ====================================================
        // CAMBIAR EL EQUIPO A "ASIGNADO"
        // ====================================================

        // id_estado = 2 corresponde a "Asignado"

        await cliente.query(
            `
            UPDATE equipos
            SET id_estado = 2
            WHERE id_equipo = $1
            `,
            [idEquipo]
        );


        // ====================================================
        // CONFIRMAR TRANSACCIÓN
        // ====================================================

        await cliente.query('COMMIT');


        // ====================================================
        // RESPUESTA EXITOSA
        // ====================================================

        return res.status(201).json({

            mensaje: 'Equipo asignado correctamente',

            asignacion: {
                ...resultadoAsignacion.rows[0],

                equipo: {
                    id_equipo: equipo.id_equipo,
                    codigo_interno: equipo.codigo_interno,
                    nombre: equipo.nombre
                },

                empleado: {
                    id_empleado: empleado.id_empleado,
                    rut: empleado.rut,
                    nombres: empleado.nombres,
                    apellidos: empleado.apellidos
                }
            }

        });


    } catch (error) {

        // ====================================================
        // REVERTIR TRANSACCIÓN SI OCURRE UN ERROR
        // ====================================================

        try {
            await cliente.query('ROLLBACK');
        } catch (errorRollback) {
            console.error(
                'Error al revertir la transacción:',
                errorRollback
            );
        }


        console.error(
            'Error al registrar la asignación:',
            error
        );


        return res.status(500).json({
            mensaje: 'Error interno al registrar la asignación'
        });


    } finally {

        // Liberar la conexión para devolverla al pool
        cliente.release();

    }

});

// ============================================================
// LISTAR ASIGNACIONES
// ============================================================

// GET http://localhost:3000/api/asignaciones
// Permite obtener las asignaciones registradas en el sistema.
// Incluye información del equipo, empleado y si la asignación
// ya posee una devolución.
// Está protegida mediante JWT.

app.get('/api/asignaciones', verificarToken, async (req, res) => {

    try {

        // ====================================================
        // OBTENER FILTROS
        // ====================================================

        const {
            estado
        } = req.query;


        // ====================================================
        // CONSULTA BASE
        // ====================================================

        let consulta = `
            SELECT
                a.id_asignacion,
                a.id_equipo,
                a.id_empleado,
                a.fecha_asignacion,
                a.observaciones AS observaciones_asignacion,

                e.codigo_interno,
                e.nombre AS nombre_equipo,
                e.marca,
                e.modelo,
                e.serial,
                e.id_estado AS id_estado_equipo,

                emp.rut,
                emp.nombres,
                emp.apellidos,
                emp.correo,

                d.id_devolucion,
                d.fecha_devolucion,
                d.condicion_devolucion,
                d.observaciones AS observaciones_devolucion

            FROM asignaciones a

            INNER JOIN equipos e
                ON a.id_equipo = e.id_equipo

            INNER JOIN empleados emp
                ON a.id_empleado = emp.id_empleado

            LEFT JOIN devoluciones d
                ON a.id_asignacion = d.id_asignacion

            WHERE 1 = 1
        `;


        // ====================================================
        // FILTRAR POR ESTADO DE LA ASIGNACIÓN
        // ====================================================

        // Una asignación se considera:
        //
        // activa:
        //     cuando todavía NO tiene una devolución.
        //
        // devuelta:
        //     cuando ya existe una devolución asociada.

        if (
            estado !== undefined &&
            estado !== null &&
            estado !== ''
        ) {

            if (estado === 'activa') {

                consulta += `
                    AND d.id_devolucion IS NULL
                `;

            } else if (estado === 'devuelta') {

                consulta += `
                    AND d.id_devolucion IS NOT NULL
                `;

            } else if (estado !== 'todas') {

                return res.status(400).json({
                    mensaje: 'El estado de la asignación no es válido'
                });

            }

        }


        // ====================================================
        // ORDENAR RESULTADOS
        // ====================================================

        consulta += `
            ORDER BY
                a.fecha_asignacion DESC,
                a.id_asignacion DESC
        `;


        // ====================================================
        // EJECUTAR CONSULTA
        // ====================================================

        const resultado = await pool.query(consulta);


        // ====================================================
        // FORMATEAR RESULTADOS
        // ====================================================

        const asignaciones = resultado.rows.map((fila) => ({

            id_asignacion: fila.id_asignacion,

            fecha_asignacion: fila.fecha_asignacion,

            observaciones: fila.observaciones_asignacion,

            estado_asignacion:
                fila.id_devolucion === null
                    ? 'Activa'
                    : 'Devuelta',

            equipo: {

                id_equipo: fila.id_equipo,

                codigo_interno: fila.codigo_interno,

                nombre: fila.nombre_equipo,

                marca: fila.marca,

                modelo: fila.modelo,

                serial: fila.serial,

                id_estado: fila.id_estado_equipo

            },

            empleado: {

                id_empleado: fila.id_empleado,

                rut: fila.rut,

                nombres: fila.nombres,

                apellidos: fila.apellidos,

                correo: fila.correo

            },

            devolucion:
                fila.id_devolucion === null
                    ? null
                    : {

                        id_devolucion: fila.id_devolucion,

                        fecha_devolucion:
                            fila.fecha_devolucion,

                        condicion_devolucion:
                            fila.condicion_devolucion,

                        observaciones:
                            fila.observaciones_devolucion

                    }

        }));


        // ====================================================
        // DEVOLVER RESULTADOS
        // ====================================================

        return res.json(asignaciones);


    } catch (error) {

        console.error(
            'Error al obtener asignaciones:',
            error
        );


        return res.status(500).json({
            mensaje: 'Error interno al obtener las asignaciones'
        });

    }

});

// ============================================================
// REGISTRAR DEVOLUCIÓN DE EQUIPO
// ============================================================

// POST http://localhost:3000/api/devoluciones
//
// Registra la devolución de una asignación activa y cambia
// automáticamente el equipo de "Asignado" a "Disponible".

app.post('/api/devoluciones', verificarToken, async (req, res) => {

    const client = await pool.connect();

    try {

        const {
            id_asignacion,
            fecha_devolucion,
            condicion_devolucion,
            observaciones
        } = req.body;


        // ====================================================
        // VALIDACIONES BÁSICAS
        // ====================================================

        if (!id_asignacion) {
            return res.status(400).json({
                mensaje: 'La asignación es obligatoria'
            });
        }

        if (!fecha_devolucion) {
            return res.status(400).json({
                mensaje: 'La fecha de devolución es obligatoria'
            });
        }

        if (
            !condicion_devolucion ||
            !condicion_devolucion.trim()
        ) {
            return res.status(400).json({
                mensaje: 'La condición de devolución es obligatoria'
            });
        }


        // ====================================================
        // VALIDAR CONDICIÓN
        // ====================================================

        const condicionesPermitidas = [
            'Buen estado',
            'Con daños',
            'Requiere reparación'
        ];

        if (
            !condicionesPermitidas.includes(
                condicion_devolucion.trim()
            )
        ) {
            return res.status(400).json({
                mensaje: 'La condición de devolución no es válida'
            });
        }


        // ====================================================
        // VALIDAR FECHA
        // ====================================================

        const fechaIngresada = new Date(
            `${fecha_devolucion}T00:00:00`
        );

        if (Number.isNaN(fechaIngresada.getTime())) {
            return res.status(400).json({
                mensaje: 'La fecha de devolución no es válida'
            });
        }

        const hoy = new Date();

        hoy.setHours(0, 0, 0, 0);

        if (fechaIngresada > hoy) {
            return res.status(400).json({
                mensaje: 'La fecha de devolución no puede ser futura'
            });
        }


        // ====================================================
        // INICIAR TRANSACCIÓN
        // ====================================================

        await client.query('BEGIN');


        // ====================================================
        // BUSCAR ASIGNACIÓN
        // ====================================================

        const resultadoAsignacion = await client.query(
            `
            SELECT
                a.id_asignacion,
                a.id_equipo,
                a.id_empleado,
                a.fecha_asignacion,

                e.codigo_interno,
                e.nombre AS nombre_equipo,
                e.id_estado,

                emp.rut,
                emp.nombres,
                emp.apellidos

            FROM asignaciones a

            INNER JOIN equipos e
                ON a.id_equipo = e.id_equipo

            INNER JOIN empleados emp
                ON a.id_empleado = emp.id_empleado

            WHERE a.id_asignacion = $1

            FOR UPDATE
            `,
            [id_asignacion]
        );


        if (resultadoAsignacion.rows.length === 0) {

            await client.query('ROLLBACK');

            return res.status(404).json({
                mensaje: 'La asignación seleccionada no existe'
            });
        }


        const asignacion = resultadoAsignacion.rows[0];


        // ====================================================
        // COMPROBAR QUE NO FUE DEVUELTA
        // ====================================================

        const resultadoDevolucionExistente =
            await client.query(
                `
                SELECT id_devolucion
                FROM devoluciones
                WHERE id_asignacion = $1
                `,
                [id_asignacion]
            );


        if (resultadoDevolucionExistente.rows.length > 0) {

            await client.query('ROLLBACK');

            return res.status(409).json({
                mensaje: 'Esta asignación ya fue devuelta'
            });
        }


        // ====================================================
        // VALIDAR FECHA CONTRA LA ASIGNACIÓN
        // ====================================================

        const fechaAsignacion =
            new Date(asignacion.fecha_asignacion);

        fechaAsignacion.setHours(0, 0, 0, 0);


        if (fechaIngresada < fechaAsignacion) {

            await client.query('ROLLBACK');

            return res.status(400).json({
                mensaje:
                    'La fecha de devolución no puede ser anterior a la fecha de asignación'
            });
        }


        // ====================================================
        // COMPROBAR ESTADO DEL EQUIPO
        // ====================================================

        // Según estados_equipo:
        // 1 = Disponible
        // 2 = Asignado
        // 3 = En reparación
        // 4 = Dado de baja

        if (asignacion.id_estado !== 2) {

            await client.query('ROLLBACK');

            return res.status(409).json({
                mensaje: 'El equipo de esta asignación no se encuentra asignado'
            });
        }


        // ====================================================
        // REGISTRAR DEVOLUCIÓN
        // ====================================================

        const resultadoDevolucion = await client.query(
            `
            INSERT INTO devoluciones
            (
                id_asignacion,
                fecha_devolucion,
                condicion_devolucion,
                observaciones
            )
            VALUES ($1, $2, $3, $4)

            RETURNING
                id_devolucion,
                id_asignacion,
                fecha_devolucion,
                condicion_devolucion,
                observaciones
            `,
            [
                id_asignacion,
                fecha_devolucion,
                condicion_devolucion.trim(),
                observaciones?.trim() || null
            ]
        );


        // ====================================================
        // DETERMINAR NUEVO ESTADO DEL EQUIPO
        // ====================================================

        // Buen estado / Con daños:
        //     vuelve a Disponible.
        //
        // Requiere reparación:
        //     pasa a En reparación.

        const nuevoEstado =
            condicion_devolucion.trim() ===
            'Requiere reparación'
                ? 3
                : 1;


        // ====================================================
        // ACTUALIZAR EQUIPO
        // ====================================================

        await client.query(
            `
            UPDATE equipos
            SET id_estado = $1
            WHERE id_equipo = $2
            `,
            [
                nuevoEstado,
                asignacion.id_equipo
            ]
        );


        // ====================================================
        // CONFIRMAR TRANSACCIÓN
        // ====================================================

        await client.query('COMMIT');


        const devolucion =
            resultadoDevolucion.rows[0];


        // ====================================================
        // RESPUESTA
        // ====================================================

        return res.status(201).json({

            mensaje: 'Devolución registrada correctamente',

            devolucion: {

                id_devolucion:
                    devolucion.id_devolucion,

                id_asignacion:
                    devolucion.id_asignacion,

                fecha_devolucion:
                    devolucion.fecha_devolucion,

                condicion_devolucion:
                    devolucion.condicion_devolucion,

                observaciones:
                    devolucion.observaciones,

                equipo: {

                    id_equipo:
                        asignacion.id_equipo,

                    codigo_interno:
                        asignacion.codigo_interno,

                    nombre:
                        asignacion.nombre_equipo,

                    nuevo_estado:
                        nuevoEstado === 3
                            ? 'En reparación'
                            : 'Disponible'
                },

                empleado: {

                    id_empleado:
                        asignacion.id_empleado,

                    rut:
                        asignacion.rut,

                    nombres:
                        asignacion.nombres,

                    apellidos:
                        asignacion.apellidos
                }
            }
        });


    } catch (error) {

        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            console.error(
                'Error al revertir la transacción:',
                rollbackError
            );
        }

        console.error(
            'Error al registrar devolución:',
            error
        );

        return res.status(500).json({
            mensaje: 'Error interno al registrar la devolución'
        });

    } finally {

        client.release();

    }

});
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