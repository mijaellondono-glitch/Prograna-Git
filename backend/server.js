const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Importar e incorporar Rutas
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Conexión a la base de datos
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Conectado correctamente'))
    .catch(err => console.error('Error de conexión a MongoDB:', err));

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('API de QuotiXX funcionando correctamente.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));