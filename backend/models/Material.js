const mongoose = require('mongoose');

const MaterialSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    categoria: {
        type: String,
        required: true,
        enum: ['madera', 'herrajes', 'insumos', 'acabados']
    },
    unidad: {
        type: String,
        required: true,
        enum: ['unidad', 'hoja', 'metro_lineal', 'galon', 'kg']
    },
    precio: { type: Number, required: true },
    descripcion: { type: String, default: '' },
    fechaRegistro: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Material', MaterialSchema);
