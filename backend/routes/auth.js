const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const User = require('../models/User');

// Configuración del servicio de correo con Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 1. REGISTRO DE USUARIO
router.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      nombre,
      email,
      password: hashedPassword
    });

    await user.save();
    res.status(201).json({ message: 'Usuario registrado exitosamente.' });

  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor al registrar usuario.', error: error.message });
  }
});

// 2. INICIO DE SESIÓN (LOGIN POR NOMBRE)
router.post('/login', async (req, res) => {
  const { nombre, password } = req.body;

  try {
    // Buscar al usuario por su nombre
    const user = await User.findOne({ nombre });
    if (!user) {
      return res.status(400).json({ message: 'Credenciales inválidas.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciales inválidas.' });
    }

    res.json({
      message: 'Inicio de sesión exitoso.',
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor al iniciar sesión.', error: error.message });
  }
});

// 3. SOLICITAR CÓDIGO DE RECUPERACIÓN (ENVÍA EL CORREO)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'El correo no está registrado en el sistema.' });
    }

    // Genera un código de 6 dígitos aleatorio
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // El código vence en 15 minutos
    user.resetCode = code;
    user.resetCodeExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    // Diseño del correo enviado
    const mailOptions = {
      from: `"QuotiXX Soporte" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Código de recuperación de contraseña - QuotiXX',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2b6cb0;">Recuperación de Contraseña</h2>
          <p>Has solicitado restablecer tu contraseña en <strong>QuotiXX</strong>.</p>
          <p>Tu código de verificación es:</p>
          <h1 style="background: #f7fafc; padding: 10px 20px; display: inline-block; border: 1px solid #e2e8f0; border-radius: 8px; color: #2d3748;">${code}</h1>
          <p>Este código vencerá en <strong>15 minutos</strong>.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Código de recuperación enviado con éxito a tu correo.' });

  } catch (error) {
    res.status(500).json({ message: 'Error al enviar el correo de recuperación.', error: error.message });
  }
});

// 4. VERIFICAR CÓDIGO Y CAMBIAR LA CONTRASEÑA
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Verificar si el código coincide y si aún no ha expirado
    if (!user.resetCode || user.resetCode !== code || user.resetCodeExpires < Date.now()) {
      return res.status(400).json({ message: 'El código es incorrecto o ha expirado.' });
    }

    // Encriptar la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Limpiar el código usado para que no vuelva a servir
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    res.json({ message: 'Tu contraseña ha sido actualizada correctamente.' });

  } catch (error) {
    res.status(500).json({ message: 'Error al cambiar la contraseña.', error: error.message });
  }
});


// ==========================================
// 📄 GENERACIÓN DE PDF: MÓDULO DE PUERTAS
// ==========================================
router.post('/cotizar-puerta-pdf', (req, res) => {
  const { 
    cliente, 
    nombreNegocio, 
    telefonoNegocio, 
    correoNegocio, 
    direccionNegocio, 
    tipoNombre, 
    ancho, 
    alto, 
    areaM2, 
    color, 
    chapa, 
    total 
  } = req.body;

  try {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Cotizacion_Puerta_${cliente.replace(/\s+/g, '_')}.pdf`);

    doc.pipe(res);

    // 1. Encabezado principal ampliado para datos del negocio
    const tituloMostrado = nombreNegocio || 'QuotiXX Carpintería';

    doc.fillColor('#0d6efd').rect(0, 0, 600, 95).fill();
    
    // Nombre del Negocio
    doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text(tituloMostrado, 40, 15);
    
    // Subtítulo y datos de contacto del negocio (Derecha e Izquierda)
    doc.fontSize(9).font('Helvetica');
    doc.text('Documento Oficial de Cotización', 40, 42);
    
    let infoNegocio = [];
    if (telefonoNegocio) infoNegocio.push(`Tel: ${telefonoNegocio}`);
    if (correoNegocio) infoNegocio.push(`Email: ${correoNegocio}`);
    if (direccionNegocio) infoNegocio.push(`Dir: ${direccionNegocio}`);

    if (infoNegocio.length > 0) {
      doc.fontSize(8.5).text(infoNegocio.join('  |  '), 40, 60, { width: 515 });
    }

    // 2. Bloque de Datos del Cliente y Fecha
    doc.moveDown(3);
    doc.fillColor('#212529').fontSize(11).font('Helvetica-Bold').text('CLIENTE:', 40, 115);
    doc.font('Helvetica').text(cliente, 95, 115);
    
    doc.font('Helvetica-Bold').text('FECHA:', 400, 115);
    doc.font('Helvetica').text(new Date().toLocaleDateString('es-CO'), 450, 115);

    doc.font('Helvetica-Bold').text('MÓDULO:', 40, 135);
    doc.font('Helvetica').text('Cotización de Puerta Personalizada', 100, 135);

    // Línea divisora
    doc.moveTo(40, 155).lineTo(555, 155).strokeColor('#dee2e6').lineWidth(1).stroke();

    // 3. Tabla de Resumen
    let startY = 170;

    // Encabezado Tabla
    doc.fillColor('#0d6efd').rect(40, startY, 515, 25).fill();
    doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
    doc.text('Concepto / Detalle', 50, startY + 8);
    doc.text('Especificación', 250, startY + 8);
    doc.text('Valor (COP)', 470, startY + 8);

    // Filas de la Tabla
    const filas = [
      ['Tipo de Puerta', tipoNombre, `$${parseInt(total - (chapa > 0 ? chapa : 0)).toLocaleString('es-CO')}`],
      ['Medidas', `${ancho} cm x ${alto} cm (${areaM2} m²)`, 'Incluido'],
      ['Acabado / Color', color, 'Incluido'],
      ['Chapa / Cerradura', chapa > 0 ? 'Sí (Incluida)' : 'No (Por el cliente)', `$${chapa.toLocaleString('es-CO')}`]
    ];

    let currentY = startY + 25;
    doc.font('Helvetica').fontSize(10);

    filas.forEach((fila, index) => {
      if (index % 2 === 0) {
        doc.fillColor('#f8f9fa').rect(40, currentY, 515, 22).fill();
      }
      doc.fillColor('#212529');
      doc.text(fila[0], 50, currentY + 6);
      doc.text(fila[1], 250, currentY + 6);
      doc.text(fila[2], 470, currentY + 6);
      currentY += 22;
    });

    // 4. Caja de Total
    currentY += 15;
    doc.fillColor('#e7f1ff').rect(320, currentY, 235, 45).fill();
    doc.rect(320, currentY, 235, 45).strokeColor('#b6d4fe').stroke();
    
    doc.fillColor('#084298').fontSize(10).font('Helvetica-Bold').text('TOTAL ESTIMADO:', 335, currentY + 10);
    doc.fillColor('#0d6efd').fontSize(16).text(`$${Math.round(total).toLocaleString('es-CO')} COP`, 335, currentY + 24);

    // Pie de página
    doc.fillColor('#6c757d').fontSize(9).font('Helvetica').text('Este documento fue generado automáticamente por QuotiXX. Válido por 15 días.', 40, 780, { align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Error al generar el PDF.', error: error.message });
  }
});

// ==========================================
// 📄 GENERACIÓN DE PDF: MÓDULO DE CLÓSETS (Próximamente)
// ==========================================


// ==========================================
// 📄 GENERACIÓN DE PDF: MÓDULO DE COCINAS (Próximamente)
// ==========================================


// Obtener configuración del negocio
router.get('/configuracion/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    
    res.json({
      nombreNegocio: user.nombreNegocio,
      telefonoNegocio: user.telefonoNegocio,
      correoNegocio: user.correoNegocio,
      direccionNegocio: user.direccionNegocio
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Guardar/Actualizar configuración del negocio
router.put('/configuracion', async (req, res) => {
  const { email, nombreNegocio, telefonoNegocio, correoNegocio, direccionNegocio } = req.body;
  try {
    const user = await User.findOneAndUpdate(
      { email },
      { nombreNegocio, telefonoNegocio, correoNegocio, direccionNegocio },
      { new: true }
    );
    res.json({ message: 'Guardado correctamente', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;