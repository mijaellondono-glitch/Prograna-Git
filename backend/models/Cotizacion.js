const mongoose = require('mongoose');

const CotizacionSchema = new mongoose.Schema({
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
    tipoMueble: { type: String, required: true }, // 'cocina', 'comedor', 'puerta', 'closet', 'cama'
    detalle: { type: String, default: '' }, // resumen legible de lo cotizado
    total: { type: Number, required: true },
    estado: { type: String, enum: ['Pendiente', 'Aprobada', 'Rechazada'], default: 'Pendiente' },
    fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cotizacion', CotizacionSchema);