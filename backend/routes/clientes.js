const express = require('express');
const router = express.Router();
const Cliente = require('../models/Cliente');

// 1. AGREGAR (o actualizar si ya existe ese teléfono) UN CLIENTE
router.post('/', async (req, res) => {
    try {
        const { nombre, telefono, direccion, email, documento } = req.body;

        if (!nombre || !telefono) {
            return res.status(400).json({ message: 'Nombre y teléfono son obligatorios.' });
        }

        // Si ya existe un cliente con ese teléfono, actualizamos sus datos en vez de duplicarlo
        const cliente = await Cliente.findOneAndUpdate(
            { telefono },
            { nombre, telefono, direccion, email, documento },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.status(201).json({ message: 'Cliente guardado.', cliente });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar el cliente.', error: error.message });
    }
});

// 2. LISTAR CLIENTES
router.get('/', async (req, res) => {
    try {
        const clientes = await Cliente.find().sort({ fechaRegistro: -1 });
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los clientes.', error: error.message });
    }
});

// 3. ELIMINAR UN CLIENTE
router.delete('/:id', async (req, res) => {
    try {
        const cliente = await Cliente.findByIdAndDelete(req.params.id);
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente no encontrado.' });
        }
        res.json({ message: 'Cliente eliminado.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el cliente.', error: error.message });
    }
});

module.exports = router;
