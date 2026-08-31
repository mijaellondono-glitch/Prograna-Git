const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  // Campos para recuperación de contraseña por correo
  resetCode: {
    type: String,
    default: null
  },
  resetCodeExpires: {
    type: Date,
    default: null
  },

  // 🔽 CAMPOS DEL NEGOCIO / CARPINTERÍA (NUEVOS) 🔽
  nombreNegocio: { type: String, default: '' },
  telefonoNegocio: { type: String, default: '' },
  correoNegocio: { type: String, default: '' },
  direccionNegocio: { type: String, default: '' },
  notificaciones: { type: String, default: 'activadas' }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);