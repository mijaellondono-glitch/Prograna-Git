const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Sirve tus pantallas .html directamente desde la raíz
app.use(express.static(path.join(__dirname, '../')));

// Sirve las fotos subidas del catálogo
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas de la API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/materiales', require('./routes/materiales'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/cotizaciones', require('./routes/cotizaciones'));

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB');
    app.listen(PORT, () => console.log(`🚀 Listo en http://localhost:${PORT}`));
  })
  .catch((err) => console.error('❌ Error BD:', err));