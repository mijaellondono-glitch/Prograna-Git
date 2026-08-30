const mongoose = require('mongoose');

const CotizacionSchema = new mongoose.Schema({
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
    tipoMueble: { type: String, required: true },
    dimensiones: {
        ancho: Number,
        alto: Number,
        profundidad: Number
    },
    materiales: [{ nombre: String, precioUnitario: Number, cantidad: Number }],
    total: { type: Number, required: true },
    estado: { type: String, enum: ['Pendiente', 'Aprobada', 'Rechazada'], default: 'Pendiente' },
    fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cotizacion', CotizacionSchema);