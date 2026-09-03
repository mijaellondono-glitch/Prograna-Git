const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Producto = require('../models/Producto');

// Carpeta donde se guardan las fotos subidas
const carpetaUploads = path.join(__dirname, '../uploads/productos');
if (!fs.existsSync(carpetaUploads)) {
    fs.mkdirSync(carpetaUploads, { recursive: true });
}

// Configuración de multer: guarda el archivo con un nombre único
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, carpetaUploads),
    filename: (req, file, cb) => {
        const sufijo = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, sufijo + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // máximo 5MB por foto
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen.'));
        }
    }
});

// 1. AGREGAR UN PRODUCTO AL CATÁLOGO (con foto)
router.post('/', upload.single('imagenMueble'), async (req, res) => {
    try {
        const { categoria, nombreMueble, descripcion, precio } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Debes subir una foto del mueble.' });
        }

        const nuevoProducto = new Producto({
            categoria,
            nombre: nombreMueble,
            descripcion,
            precio,
            imagenUrl: `/uploads/productos/${req.file.filename}`
        });

        await nuevoProducto.save();
        res.status(201).json({ message: 'Producto agregado al catálogo.', producto: nuevoProducto });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar el producto.', error: error.message });
    }
});

// 2. LISTAR PRODUCTOS (opcionalmente filtrados por categoría)
// Ejemplo: GET /api/productos?categoria=puertas
router.get('/', async (req, res) => {
    try {
        const filtro = req.query.categoria ? { categoria: req.query.categoria } : {};
        const productos = await Producto.find(filtro).sort({ fechaRegistro: -1 });
        res.json(productos);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los productos.', error: error.message });
    }
});

// 3. ELIMINAR UN PRODUCTO
router.delete('/:id', async (req, res) => {
    try {
        const producto = await Producto.findByIdAndDelete(req.params.id);
        if (!producto) {
            return res.status(404).json({ message: 'Producto no encontrado.' });
        }

        // Borrar también la foto del disco
        const rutaImagen = path.join(__dirname, '..', producto.imagenUrl);
        fs.unlink(rutaImagen, () => {}); // si falla, no importa (no rompe la respuesta)

        res.json({ message: 'Producto eliminado.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el producto.', error: error.message });
    }
});

module.exports = router;
