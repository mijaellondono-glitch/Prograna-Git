// ==========================================
// MODELO: Cotizacion
// Autor: Mijael Londoño Uribe
// Descripción: Representa una cotización generada para un cliente
// (cocina, comedor, puerta, closet o cama). Cada cotización queda
// asociada a un cliente y al negocio (propietario) que la creó,
// para que cada carpintería solo vea su propio historial.
// ==========================================

const mongoose = require('mongoose');

const CotizacionSchema = new mongoose.Schema({
    // Email del negocio dueño de esta cotización (separa los datos por cuenta)
    propietario: { type: String, required: true },

    // Referencia al cliente al que se le hizo la cotización (relación con Cliente)
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },

    // Tipo de mueble cotizado: 'cocina', 'comedor', 'puerta', 'closet' o 'cama'
    tipoMueble: { type: String, required: true },

    // Resumen legible de lo cotizado (material, color, medidas, etc.)
    detalle: { type: String, default: '' },

    // Valor total estimado de la cotización, en pesos colombianos (COP)
    total: { type: Number, required: true },

    // Estado del seguimiento comercial de la cotización
    estado: { type: String, enum: ['Pendiente', 'Aprobada', 'Rechazada'], default: 'Pendiente' },

    // Fecha en la que se generó la cotización
    fecha: { type: Date, default: Date.now }
});

// Exporta el modelo para poder usarlo en las rutas (backend/routes/cotizaciones.js)
module.exports = mongoose.model('Cotizacion', CotizacionSchema);
