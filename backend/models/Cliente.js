const mongoose = require('mongoose');

const ClienteSchema = new mongoose.Schema({
    propietario: { type: String, required: true }, // email del negocio dueño de este cliente
    nombre: { type: String, required: true },
    telefono: { type: String, required: true },
    documento: { type: String },
    email: { type: String },
    direccion: { type: String },
    fechaRegistro: { type: Date, default: Date.now }
});

// Un mismo teléfono puede repetirse entre negocios distintos, pero no dentro del mismo negocio
ClienteSchema.index({ propietario: 1, telefono: 1 }, { unique: true });

module.exports = mongoose.model('Cliente', ClienteSchema);