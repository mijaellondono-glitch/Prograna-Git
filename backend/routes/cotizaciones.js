const express = require('express');
const router = express.Router();
const Cotizacion = require('../models/Cotizacion');
const Cliente = require('../models/Cliente');

// 1. REGISTRAR UNA COTIZACIÓN EN EL HISTORIAL
// Se llama automáticamente desde cada pantalla de "cotizar-X" después de generar el PDF.
// Si el teléfono del cliente ya existe, reutiliza ese cliente; si no, lo crea.
router.post('/', async (req, res) => {
    try {
        const { clienteNombre, clienteTelefono, tipoMueble, detalle, total } = req.body;

        if (!clienteNombre || !clienteTelefono || !tipoMueble || total === undefined) {
            return res.status(400).json({ message: 'Faltan datos para registrar la cotización.' });
        }

        // Busca el cliente por teléfono; si no existe, lo crea
        const cliente = await Cliente.findOneAndUpdate(
            { telefono: clienteTelefono },
            { nombre: clienteNombre, telefono: clienteTelefono },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        const nuevaCotizacion = new Cotizacion({
            cliente: cliente._id,
            tipoMueble,
            detalle: detalle || '',
            total
        });

        await nuevaCotizacion.save();

        res.status(201).json({ message: 'Cotización guardada en el historial.', cotizacion: nuevaCotizacion });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar la cotización.', error: error.message });
    }
});

// 2. LISTAR HISTORIAL (con el nombre y teléfono del cliente incluido)
router.get('/', async (req, res) => {
    try {
        const cotizaciones = await Cotizacion.find()
            .populate('cliente', 'nombre telefono')
            .sort({ fecha: -1 });
        res.json(cotizaciones);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el historial.', error: error.message });
    }
});

// 3. ACTUALIZAR ESTADO DE UNA COTIZACIÓN (Pendiente / Aprobada / Rechazada)
router.put('/:id/estado', async (req, res) => {
    try {
        const { estado } = req.body;
        const cotizacion = await Cotizacion.findByIdAndUpdate(req.params.id, { estado }, { new: true });
        if (!cotizacion) {
            return res.status(404).json({ message: 'Cotización no encontrada.' });
        }
        res.json({ message: 'Estado actualizado.', cotizacion });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el estado.', error: error.message });
    }
});

// 4. ELIMINAR UNA COTIZACIÓN DEL HISTORIAL
router.delete('/:id', async (req, res) => {
    try {
        const cotizacion = await Cotizacion.findByIdAndDelete(req.params.id);
        if (!cotizacion) {
            return res.status(404).json({ message: 'Cotización no encontrada.' });
        }
        res.json({ message: 'Cotización eliminada.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la cotización.', error: error.message });
    }
});

module.exports = router;
