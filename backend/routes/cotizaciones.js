// ==========================================
// RUTA: /api/cotizaciones
// Autor: Mijael Londoño Uribe
// Descripción: Maneja el historial de cotizaciones de Quotixx.
// Aquí se registran las cotizaciones generadas (cocina, comedor,
// puerta, closet, cama), se consultan, se actualiza su estado
// (Pendiente/Aprobada/Rechazada) y se pueden eliminar.
// ==========================================

const express = require('express');
const router = express.Router();
const Cotizacion = require('../models/Cotizacion');
const Cliente = require('../models/Cliente');

// ------------------------------------------
// 1. INSERTAR: registrar una nueva cotización en el historial
// Se llama automáticamente desde cada pantalla "cotizar-X" justo
// después de generar el PDF. Si el cliente (por teléfono) ya existe
// dentro de este negocio, se reutiliza; si no, se crea uno nuevo.
// ------------------------------------------
router.post('/', async (req, res) => {
    try {
        const { propietario, clienteNombre, clienteTelefono, tipoMueble, detalle, total } = req.body;

        // Validación: sin negocio identificado, no se puede guardar nada
        if (!propietario) {
            return res.status(400).json({ message: 'Falta identificar el negocio (propietario).' });
        }
        // Validación de campos obligatorios de la cotización
        if (!clienteNombre || !clienteTelefono || !tipoMueble || total === undefined) {
            return res.status(400).json({ message: 'Faltan datos para registrar la cotización.' });
        }

        // Busca el cliente por teléfono DENTRO de este negocio (propietario);
        // si no existe todavía, lo crea automáticamente (upsert)
        const cliente = await Cliente.findOneAndUpdate(
            { propietario, telefono: clienteTelefono },
            { propietario, nombre: clienteNombre, telefono: clienteTelefono },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // Crea el registro de la cotización, enlazado a ese cliente
        const nuevaCotizacion = new Cotizacion({
            propietario,
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

// ------------------------------------------
// 2. CONSULTAR: listar el historial completo de UN negocio
// Se filtra siempre por "propietario" para que cada cuenta
// solo vea sus propias cotizaciones (nunca las de otro negocio).
// Se usa populate() para traer también el nombre y teléfono
// del cliente relacionado, sin tener que hacer una segunda consulta.
// ------------------------------------------
router.get('/', async (req, res) => {
    try {
        const { propietario } = req.query;
        if (!propietario) {
            return res.status(400).json({ message: 'Falta identificar el negocio (propietario).' });
        }
        const cotizaciones = await Cotizacion.find({ propietario })
            .populate('cliente', 'nombre telefono')
            .sort({ fecha: -1 }); // Más recientes primero
        res.json(cotizaciones);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el historial.', error: error.message });
    }
});

// ------------------------------------------
// 3. ACTUALIZAR: cambiar el estado de una cotización
// (por ejemplo, cuando el cliente la aprueba o la rechaza)
// ------------------------------------------
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

// ------------------------------------------
// 4. ELIMINAR: borrar una cotización del historial
// Se verifica que el "propietario" coincida, para que un negocio
// no pueda borrar por accidente (o a propósito) la cotización de otro.
// ------------------------------------------
router.delete('/:id', async (req, res) => {
    try {
        const { propietario } = req.query;
        if (!propietario) {
            return res.status(400).json({ message: 'Falta identificar el negocio (propietario).' });
        }
        const cotizacion = await Cotizacion.findOneAndDelete({ _id: req.params.id, propietario });
        if (!cotizacion) {
            return res.status(404).json({ message: 'Cotización no encontrada.' });
        }
        res.json({ message: 'Cotización eliminada.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la cotización.', error: error.message });
    }
});

// Exporta el router para que server.js lo registre en /api/cotizaciones
module.exports = router;
