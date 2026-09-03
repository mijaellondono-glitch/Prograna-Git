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
    telefonoCliente,
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
    doc.font('Helvetica').text(telefonoCliente ? `${cliente}  (Tel: ${telefonoCliente})` : cliente, 95, 115);
    
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
// 📄 GENERACIÓN DE PDF: MÓDULO DE COCINAS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const btnGenerar = document.getElementById('btnGenerar');

    if (btnGenerar) {
        btnGenerar.addEventListener('click', (e) => {
            // Previene cualquier propagación extra
            e.preventDefault();

            // 1. Validar cliente
            const clienteInput = document.getElementById('clienteInput');
            const cliente = clienteInput ? clienteInput.value : '';
            
            if (!cliente.trim()) {
                alert('Por favor, ingresa el nombre del cliente.');
                return;
            }

            // 2. Datos de configuración del negocio (LocalStorage)
            const nombreCarpinteria = localStorage.getItem('nombreCarpinteria') || 'QuotiXX Carpintería';
            const telefono = localStorage.getItem('telefonoCarpinteria') || '';
            const direccion = localStorage.getItem('direccionCarpinteria') || '';

            const val = (id) => document.getElementById(id)?.value || '';
            const txt = (id) => document.getElementById(id)?.innerText || '$0';

            // 3. Recolectar datos del DOM de la cocina
            const datosCocina = {
                cliente,
                nombreCarpinteria,
                telefono,
                direccion,
                material: val('material'),
                color: val('color'),
                tipoBisagras: val('tipoBisagras'),
                disenoBajo: val('disenoBajo'),
                largoBajoPared1: val('largoBajoPared1'),
                largoBajoPared2: val('largoBajoPared2'),
                largoBajoPared3: val('largoBajoPared3'),
                manijaInferior: val('manijaInferior'),
                meson: val('meson'),
                precioMetroMeson: val('precioMetroMeson'),
                deseaChut: val('deseaChut'),
                disenoAlto: val('disenoAlto'),
                largoAltoPared1: val('largoAltoPared1'),
                largoAltoPared2: val('largoAltoPared2'),
                largoAltoPared3: val('largoAltoPared3'),
                alturaGabinete: val('alturaGabinete'),
                aperturaPuertasSuperiores: val('aperturaPuertasSuperiores'),
                manijaSuperior: val('manijaSuperior'),
                deseaLed: val('deseaLed'),
                colorLed: val('colorLed'),
                ubicacionLed: val('ubicacionLed'),
                totalEstimado: txt('precioTotal')
            };

            // 4. Crear ventana emergente de impresión / PDF limpia
            const ventanaImpresion = window.open('', '_blank');
            
            if (!ventanaImpresion) {
                alert('El navegador bloqueó la ventana emergente. Por favor, habilítala.');
                return;
            }

            ventanaImpresion.document.write(`
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <title>Cotización - ${datosCocina.cliente}</title>
                    <style>
                        body { font-family: Arial, sans-serif; color: #333; margin: 30px; line-height: 1.5; }
                        .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 15px; margin-bottom: 25px; }
                        .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
                        .header p { margin: 4px 0; font-size: 14px; color: #555; }
                        .section-title { background: #eaeaea; padding: 6px 12px; font-size: 14px; font-weight: bold; margin-top: 20px; border-left: 4px solid #333; }
                        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
                        table, th, td { border: 1px solid #ccc; }
                        th, td { padding: 8px 10px; text-align: left; }
                        th { background-color: #f9f9f9; width: 35%; }
                        .total-box { margin-top: 30px; text-align: right; font-size: 18px; font-weight: bold; background: #f4f4f4; padding: 12px; border: 1px solid #ddd; }
                        .no-print { margin-top: 30px; text-align: center; }
                        .btn-imprimir { padding: 12px 25px; font-size: 16px; cursor: pointer; background: #000; color: #fff; border: none; border-radius: 5px; font-weight: bold; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>${datosCocina.nombreCarpinteria}</h1>
                        <p><strong>Teléfono:</strong> ${datosCocina.telefono} | <strong>Dirección:</strong> ${datosCocina.direccion}</p>
                        <p style="margin-top: 8px; font-size: 15px; font-weight: bold;">COTIZACIÓN DE COCINA INTEGRAL</p>
                    </div>
                    <p><strong>Cliente:</strong> ${datosCocina.cliente}</p>
                    <p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>

                    <div class="section-title">1. ESPECIFICACIONES GENERALES</div>
                    <table>
                        <tr><th>Material</th><td>${datosCocina.material}</td></tr>
                        <tr><th>Color</th><td>${datosCocina.color}</td></tr>
                        <tr><th>Bisagras</th><td>${datosCocina.tipoBisagras}</td></tr>
                    </table>

                    <div class="section-title">2. MUEBLE INFERIOR</div>
                    <table>
                        <tr><th>Diseño Bajo</th><td>${datosCocina.disenoBajo}</td></tr>
                        <tr><th>Paredes (m)</th><td>P1: ${datosCocina.largoBajoPared1} | P2: ${datosCocina.largoBajoPared2} | P3: ${datosCocina.largoBajoPared3}</td></tr>
                        <tr><th>Manijas</th><td>${datosCocina.manijaInferior}</td></tr>
                        <tr><th>Mesón</th><td>${datosCocina.meson} (m²: $${datosCocina.precioMetroMeson})</td></tr>
                        <tr><th>Chut</th><td>${datosCocina.deseaChut}</td></tr>
                    </table>

                    <div class="section-title">3. MUEBLE SUPERIOR</div>
                    <table>
                        <tr><th>Diseño Alto</th><td>${datosCocina.disenoAlto}</td></tr>
                        <tr><th>Paredes (m)</th><td>P1: ${datosCocina.largoAltoPared1} | P2: ${datosCocina.largoAltoPared2} | P3: ${datosCocina.largoAltoPared3}</td></tr>
                        <tr><th>Altura Gabinete</th><td>${datosCocina.alturaGabinete} cm</td></tr>
                        <tr><th>Apertura</th><td>${datosCocina.aperturaPuertasSuperiores}</td></tr>
                        <tr><th>Manijas</th><td>${datosCocina.manijaSuperior}</td></tr>
                    </table>

                    <div class="section-title">4. ILUMINACIÓN LED</div>
                    <table>
                        <tr><th>Luz LED</th><td>${datosCocina.deseaLed}</td></tr>
                        <tr><th>Detalle</th><td>${datosCocina.deseaLed === 'si' ? `${datosCocina.colorLed} - ${datosCocina.ubicacionLed}` : 'No aplica'}</td></tr>
                    </table>

                    <div class="total-box">TOTAL ESTIMADO: ${datosCocina.totalEstimado}</div>

                    <div class="no-print">
                        <button class="btn-imprimir" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
                    </div>
                </body>
                </html>
            `);
            ventanaImpresion.document.close();
        });
    }
});


// ==========================================
// 📄 GENERACIÓN DE PDF: MÓDULO DE COMEDORES
// ==========================================
router.post('/cotizar-comedor-pdf', (req, res) => {
  const { 
    cliente, 
    telefonoCliente,
    nombreNegocio, 
    telefonoNegocio, 
    correoNegocio, 
    direccionNegocio, 
    puestosTexto, 
    incluyeSillasTexto, 
    forma, 
    largo, 
    ancho, 
    material, 
    color, 
    total 
  } = req.body;

  try {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Cotizacion_Comedor_${cliente.replace(/\s+/g, '_')}.pdf`);

    doc.pipe(res);

    // 1. Encabezado principal
    const tituloMostrado = nombreNegocio || 'QuotiXX Carpintería';
    doc.fillColor('#0d6efd').rect(0, 0, 600, 95).fill();
    
    doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text(tituloMostrado, 40, 15);
    doc.fontSize(9).font('Helvetica').text('Documento Oficial de Cotización', 40, 42);
    
    let infoNegocio = [];
    if (telefonoNegocio) infoNegocio.push(`Tel: ${telefonoNegocio}`);
    if (correoNegocio) infoNegocio.push(`Email: ${correoNegocio}`);
    if (direccionNegocio) infoNegocio.push(`Dir: ${direccionNegocio}`);

    if (infoNegocio.length > 0) {
      doc.fontSize(8.5).text(infoNegocio.join('  |  '), 40, 60, { width: 515 });
    }

    // 2. Datos del cliente
    doc.moveDown(3);
    doc.fillColor('#212529').fontSize(11).font('Helvetica-Bold').text('CLIENTE:', 40, 115);
    doc.font('Helvetica').text(telefonoCliente ? `${cliente}  (Tel: ${telefonoCliente})` : cliente, 95, 115);
    
    doc.font('Helvetica-Bold').text('FECHA:', 400, 115);
    doc.font('Helvetica').text(new Date().toLocaleDateString('es-CO'), 450, 115);

    doc.font('Helvetica-Bold').text('MÓDULO:', 40, 135);
    doc.font('Helvetica').text('Cotización de Comedor Personalizado', 100, 135);

    doc.moveTo(40, 155).lineTo(555, 155).strokeColor('#dee2e6').lineWidth(1).stroke();

    // 3. Tabla de Detalles
    let startY = 170;

    doc.fillColor('#0d6efd').rect(40, startY, 515, 25).fill();
    doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
    doc.text('Concepto / Detalle', 50, startY + 8);
    doc.text('Especificación', 250, startY + 8);
    doc.text('Estado', 470, startY + 8);

    const filas = [
      ['Capacidad / Puestos', puestosTexto, 'Incluido'],
      ['Configuración', incluyeSillasTexto, 'Incluido'],
      ['Forma de la Mesa', forma, 'Incluido'],
      ['Dimensiones', `Largo: ${largo} cm | Ancho: ${ancho} cm`, 'Incluido'],
      ['Material / Madera', material, 'Incluido'],
      ['Acabado / Color', color, 'Incluido']
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

    // 4. Total
    currentY += 15;
    doc.fillColor('#e7f1ff').rect(320, currentY, 235, 45).fill();
    doc.rect(320, currentY, 235, 45).strokeColor('#b6d4fe').stroke();
    
    doc.fillColor('#084298').fontSize(10).font('Helvetica-Bold').text('TOTAL ESTIMADO:', 335, currentY + 10);
    doc.fillColor('#0d6efd').fontSize(16).text(`$${Math.round(total).toLocaleString('es-CO')} COP`, 335, currentY + 24);

    // Pie de página
    doc.fillColor('#6c757d').fontSize(9).font('Helvetica').text('Este documento fue generado automáticamente por QuotiXX. Válido por 15 días.', 40, 780, { align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Error al generar el PDF del comedor.', error: error.message });
  }
});

// ==========================================
// 📄 GENERACIÓN DE PDF: MÓDULO DE CLOSETS
// ==========================================
router.post('/cotizar-closet-pdf', (req, res) => {
  const {
    cliente,
    telefonoCliente,
    nombreNegocio,
    telefonoNegocio,
    correoNegocio,
    direccionNegocio,
    tipoCloset,
    alto,
    ancho,
    profundidad,
    tipoPuertas,
    material,
    color,
    total
  } = req.body;

  try {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Cotizacion_Closet_${cliente.replace(/\s+/g, '_')}.pdf`);

    doc.pipe(res);

    const tituloMostrado = nombreNegocio || 'QuotiXX Carpintería';
    doc.fillColor('#0d6efd').rect(0, 0, 600, 95).fill();
    doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text(tituloMostrado, 40, 15);
    doc.fontSize(9).font('Helvetica').text('Documento Oficial de Cotización', 40, 42);

    let infoNegocio = [];
    if (telefonoNegocio) infoNegocio.push(`Tel: ${telefonoNegocio}`);
    if (correoNegocio) infoNegocio.push(`Email: ${correoNegocio}`);
    if (direccionNegocio) infoNegocio.push(`Dir: ${direccionNegocio}`);
    if (infoNegocio.length > 0) {
      doc.fontSize(8.5).text(infoNegocio.join('  |  '), 40, 60, { width: 515 });
    }

    doc.moveDown(3);
    doc.fillColor('#212529').fontSize(11).font('Helvetica-Bold').text('CLIENTE:', 40, 115);
    doc.font('Helvetica').text(telefonoCliente ? `${cliente}  (Tel: ${telefonoCliente})` : cliente, 95, 115);

    doc.font('Helvetica-Bold').text('FECHA:', 400, 115);
    doc.font('Helvetica').text(new Date().toLocaleDateString('es-CO'), 450, 115);

    doc.font('Helvetica-Bold').text('MÓDULO:', 40, 135);
    doc.font('Helvetica').text('Cotización de Closet Personalizado', 100, 135);

    doc.moveTo(40, 155).lineTo(555, 155).strokeColor('#dee2e6').lineWidth(1).stroke();

    let startY = 170;
    doc.fillColor('#0d6efd').rect(40, startY, 515, 25).fill();
    doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
    doc.text('Concepto / Detalle', 50, startY + 8);
    doc.text('Especificación', 250, startY + 8);
    doc.text('Estado', 470, startY + 8);

    const filas = [
      ['Tipo de Closet', tipoCloset, 'Incluido'],
      ['Dimensiones', `Alto: ${alto} cm | Ancho: ${ancho} cm | Prof: ${profundidad} cm`, 'Incluido'],
      ['Tipo de Puertas', tipoPuertas, 'Incluido'],
      ['Material / Madera', material, 'Incluido'],
      ['Acabado / Color', color, 'Incluido']
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

    currentY += 15;
    doc.fillColor('#e7f1ff').rect(320, currentY, 235, 45).fill();
    doc.rect(320, currentY, 235, 45).strokeColor('#b6d4fe').stroke();
    doc.fillColor('#084298').fontSize(10).font('Helvetica-Bold').text('TOTAL ESTIMADO:', 335, currentY + 10);
    doc.fillColor('#0d6efd').fontSize(16).text(`$${Math.round(total).toLocaleString('es-CO')} COP`, 335, currentY + 24);

    doc.fillColor('#6c757d').fontSize(9).font('Helvetica').text('Este documento fue generado automáticamente por QuotiXX. Válido por 15 días.', 40, 780, { align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Error al generar el PDF del closet.', error: error.message });
  }
});

// ==========================================
// 📄 GENERACIÓN DE PDF: MÓDULO DE CAMAS
// ==========================================
router.post('/cotizar-cama-pdf', (req, res) => {
  const {
    cliente,
    telefonoCliente,
    nombreNegocio,
    telefonoNegocio,
    correoNegocio,
    direccionNegocio,
    tamanoTexto,
    cabeceroTexto,
    mesitasTexto,
    almacenamientoTexto,
    material,
    color,
    total
  } = req.body;

  try {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Cotizacion_Cama_${cliente.replace(/\s+/g, '_')}.pdf`);

    doc.pipe(res);

    const tituloMostrado = nombreNegocio || 'QuotiXX Carpintería';
    doc.fillColor('#0d6efd').rect(0, 0, 600, 95).fill();
    doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text(tituloMostrado, 40, 15);
    doc.fontSize(9).font('Helvetica').text('Documento Oficial de Cotización', 40, 42);

    let infoNegocio = [];
    if (telefonoNegocio) infoNegocio.push(`Tel: ${telefonoNegocio}`);
    if (correoNegocio) infoNegocio.push(`Email: ${correoNegocio}`);
    if (direccionNegocio) infoNegocio.push(`Dir: ${direccionNegocio}`);
    if (infoNegocio.length > 0) {
      doc.fontSize(8.5).text(infoNegocio.join('  |  '), 40, 60, { width: 515 });
    }

    doc.moveDown(3);
    doc.fillColor('#212529').fontSize(11).font('Helvetica-Bold').text('CLIENTE:', 40, 115);
    doc.font('Helvetica').text(telefonoCliente ? `${cliente}  (Tel: ${telefonoCliente})` : cliente, 95, 115);

    doc.font('Helvetica-Bold').text('FECHA:', 400, 115);
    doc.font('Helvetica').text(new Date().toLocaleDateString('es-CO'), 450, 115);

    doc.font('Helvetica-Bold').text('MÓDULO:', 40, 135);
    doc.font('Helvetica').text('Cotización de Cama Personalizada', 100, 135);

    doc.moveTo(40, 155).lineTo(555, 155).strokeColor('#dee2e6').lineWidth(1).stroke();

    let startY = 170;
    doc.fillColor('#0d6efd').rect(40, startY, 515, 25).fill();
    doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
    doc.text('Concepto / Detalle', 50, startY + 8);
    doc.text('Especificación', 250, startY + 8);
    doc.text('Estado', 470, startY + 8);

    const filas = [
      ['Tamaño', tamanoTexto, 'Incluido'],
      ['Cabecero', cabeceroTexto, 'Incluido'],
      ['Mesitas de Noche', mesitasTexto, 'Incluido'],
      ['Almacenamiento', almacenamientoTexto, 'Incluido'],
      ['Material / Madera', material, 'Incluido'],
      ['Acabado / Color', color, 'Incluido']
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

    currentY += 15;
    doc.fillColor('#e7f1ff').rect(320, currentY, 235, 45).fill();
    doc.rect(320, currentY, 235, 45).strokeColor('#b6d4fe').stroke();
    doc.fillColor('#084298').fontSize(10).font('Helvetica-Bold').text('TOTAL ESTIMADO:', 335, currentY + 10);
    doc.fillColor('#0d6efd').fontSize(16).text(`$${Math.round(total).toLocaleString('es-CO')} COP`, 335, currentY + 24);

    doc.fillColor('#6c757d').fontSize(9).font('Helvetica').text('Este documento fue generado automáticamente por QuotiXX. Válido por 15 días.', 40, 780, { align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Error al generar el PDF de la cama.', error: error.message });
  }
});

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