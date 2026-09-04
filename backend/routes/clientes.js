const express = require('express');
const router = express.Router();
const Cliente = require('../models/Cliente');

// 1. AGREGAR (o actualizar si ya existe ese teléfono PARA ESE NEGOCIO) UN CLIENTE
router.post('/', async (req, res) => {
    try {
        const { propietario, nombre, telefono, direccion, email, documento } = req.body;

        if (!propietario) {
            return res.status(400).json({ message: 'Falta identificar el negocio (propietario).' });
        }
        if (!nombre || !telefono) {
            return res.status(400).json({ message: 'Nombre y teléfono son obligatorios.' });
        }

        // Si este NEGOCIO ya tiene un cliente con ese teléfono, actualizamos en vez de duplicar
        const cliente = await Cliente.findOneAndUpdate(
            { propietario, telefono },
            { propietario, nombre, telefono, direccion, email, documento },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.status(201).json({ message: 'Cliente guardado.', cliente });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar el cliente.', error: error.message });
    }
});

// 2. LISTAR CLIENTES (solo los del negocio indicado en ?propietario=)
router.get('/', async (req, res) => {
    try {
        const { propietario } = req.query;
        if (!propietario) {
            return res.status(400).json({ message: 'Falta identificar el negocio (propietario).' });
        }
        const clientes = await Cliente.find({ propietario }).sort({ fechaRegistro: -1 });
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los clientes.', error: error.message });
    }
});

// 3. ELIMINAR UN CLIENTE (solo si pertenece al negocio que lo pide)
router.delete('/:id', async (req, res) => {
    try {
        const { propietario } = req.query;
        if (!propietario) {
            return res.status(400).json({ message: 'Falta identificar el negocio (propietario).' });
        }
        const cliente = await Cliente.findOneAndDelete({ _id: req.params.id, propietario });
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente no encontrado.' });
        }
        res.json({ message: 'Cliente eliminado.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el cliente.', error: error.message });
    }
});

module.exports = router;
