const express = require('express');
const router = express.Router();
const Material = require('../models/Material');

// 1. AGREGAR UN MATERIAL
router.post('/', async (req, res) => {
    try {
        const { nombre, categoria, unidad, precio, descripcion } = req.body;

        const nuevoMaterial = new Material({ nombre, categoria, unidad, precio, descripcion });
        await nuevoMaterial.save();

        res.status(201).json({ message: 'Material agregado.', material: nuevoMaterial });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar el material.', error: error.message });
    }
});

// 2. LISTAR MATERIALES (opcionalmente filtrados por categoría)
router.get('/', async (req, res) => {
    try {
        const filtro = req.query.categoria ? { categoria: req.query.categoria } : {};
        const materiales = await Material.find(filtro).sort({ fechaRegistro: -1 });
        res.json(materiales);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los materiales.', error: error.message });
    }
});

// 3. ELIMINAR UN MATERIAL
router.delete('/:id', async (req, res) => {
    try {
        const material = await Material.findByIdAndDelete(req.params.id);
        if (!material) {
            return res.status(404).json({ message: 'Material no encontrado.' });
        }
        res.json({ message: 'Material eliminado.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el material.', error: error.message });
    }
});

module.exports = router;
