const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Registro
router.post('/register', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
        }

        const usuarioExiste = await User.findOne({ 
            nombre: { $regex: new RegExp(`^${nombre.trim()}$`, 'i') } 
        });

        if (usuarioExiste) {
            return res.status(400).json({ mensaje: 'El nombre de usuario ya existe.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const nuevoUsuario = new User({ 
            nombre: nombre.trim(), 
            email: email.trim(), 
            password: passwordHash 
        });

        await nuevoUsuario.save();
        res.status(201).json({ mensaje: 'Usuario registrado exitosamente.' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al registrar.', error: error.message });
    }
});

// Login con mensajes de error específicos
router.post('/login', async (req, res) => {
    try {
        const { nombre, password } = req.body;

        if (!nombre || !password) {
            return res.status(400).json({ mensaje: 'Por favor ingresa usuario y contraseña.' });
        }

        const usuario = await User.findOne({ 
            nombre: { $regex: new RegExp(`^${nombre.trim()}$`, 'i') } 
        });

        if (!usuario) {
            return res.status(400).json({ mensaje: 'El usuario no existe en la base de datos.' });
        }

        const esValida = await bcrypt.compare(password, usuario.password);
        if (!esValida) {
            return res.status(400).json({ mensaje: 'La contraseña es incorrecta.' });
        }

        res.json({ 
            mensaje: 'Inicio de sesión exitoso.', 
            usuario: { id: usuario._id, nombre: usuario.nombre, email: usuario.email } 
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor.', error: error.message });
    }
});

module.exports = router;