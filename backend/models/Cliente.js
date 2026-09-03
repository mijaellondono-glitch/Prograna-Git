const mongoose = require('mongoose');

const ClienteSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    telefono: { type: String, required: true, unique: true },
    documento: { type: String },
    email: { type: String },
    direccion: { type: String },
    fechaRegistro: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cliente', ClienteSchema);