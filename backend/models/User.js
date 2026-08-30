const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    nombre: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    fechaCreacion: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);