const mongoose = require('mongoose');

const ProductoSchema = new mongoose.Schema({
    propietario: { type: String, required: true }, // email del negocio dueño de este producto
    categoria: {
        type: String,
        required: true,
        enum: ['puertas', 'closets', 'cocinas', 'camas', 'comedores']
    },
    nombre: { type: String, required: true },
    descripcion: { type: String, required: true },
    precio: { type: Number, required: true },
    imagenUrl: { type: String, required: true },
    fechaRegistro: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Producto', ProductoSchema);
