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

// Modelos que necesitan sincronizar sus índices (borra índices viejos que ya
// no coinciden con el esquema actual, por ejemplo cuando se cambia unique: true
// de un campo a un índice compuesto)
const Cliente = require('./models/Cliente');
const Producto = require('./models/Producto');
const Material = require('./models/Material');
const Cotizacion = require('./models/Cotizacion');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Conectado a MongoDB');

    // Sincroniza los índices de cada modelo con lo que dice su esquema actual
    try {
      await Cliente.syncIndexes();
      await Producto.syncIndexes();
      await Material.syncIndexes();
      await Cotizacion.syncIndexes();
      console.log('✅ Índices sincronizados correctamente');
    } catch (err) {
      console.error('⚠️  No se pudieron sincronizar los índices:', err.message);
    }

    app.listen(PORT, () => console.log(`🚀 Listo en http://localhost:${PORT}`));
  })
  .catch((err) => console.error('❌ Error BD:', err));