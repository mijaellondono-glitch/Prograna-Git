const express = require('express');
const router = express.Router();
const Material = require('../models/Material');

// 1. AGREGAR UN MATERIAL
router.post('/', async (req, res) => {
    try {
        const { propietario, nombre, categoria, unidad, precio, descripcion } = req.body;

        if (!propietario) {
            return res.status(400).json({ message: 'Falta identificar el negocio (propietario).' });
        }

        const nuevoMaterial = new Material({ propietario, nombre, categoria, unidad, precio, descripcion });
        await nuevoMaterial.save();

        res.status(201).json({ message: 'Material agregado.', material: nuevoMaterial });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar el material.', error: error.message });
    }
});

// 2. LISTAR MATERIALES del negocio (?propietario=...), opcionalmente filtrados por categoría
router.get('/', async (req, res) => {
    try {
        const { propietario, categoria } = req.query;
        if (!propietario) {
            return res.status(400).json({ message: 'Falta identificar el negocio (propietario).' });
        }
        const filtro = categoria ? { propietario, categoria } : { propietario };
        const materiales = await Material.find(filtro).sort({ fechaRegistro: -1 });
        res.json(materiales);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los materiales.', error: error.message });
    }
});

// 3. ELIMINAR UN MATERIAL (solo si pertenece al negocio que lo pide)
router.delete('/:id', async (req, res) => {
    try {
        const { propietario } = req.query;
        if (!propietario) {
            return res.status(400).json({ message: 'Falta identificar el negocio (propietario).' });
        }
        const material = await Material.findOneAndDelete({ _id: req.params.id, propietario });
        if (!material) {
            return res.status(404).json({ message: 'Material no encontrado.' });
        }
        res.json({ message: 'Material eliminado.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el material.', error: error.message });
    }
});

module.exports = router;
