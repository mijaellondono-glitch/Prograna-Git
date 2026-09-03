// ==========================================
// 📄 GENERACIÓN DE PDF: MÓDULO DE COCINAS
// (Frontend — va en js/pdf-cocina.js, cargado desde cotizar-cocina.html)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const btnGenerar = document.getElementById('btnGenerar');

    if (btnGenerar) {
        btnGenerar.addEventListener('click', (e) => {
            e.preventDefault();

            // 1. Validar cliente
            const clienteInput = document.getElementById('clienteInput');
            const cliente = clienteInput ? clienteInput.value : '';
            const telefonoClienteInput = document.getElementById('telefonoClienteInput');
            const telefonoCliente = telefonoClienteInput ? telefonoClienteInput.value.trim() : '';

            if (!cliente.trim()) {
                alert('Por favor, ingresa el nombre del cliente.');
                return;
            }

            if (!telefonoCliente) {
                alert('Por favor, ingresa el teléfono del cliente.');
                return;
            }

            // 2. Datos de configuración del negocio (LocalStorage)
            // ⚠️ CORREGIDO: estas claves deben coincidir con las que guarda configuracion.html
            const nombreCarpinteria = localStorage.getItem('nombreNegocio') || 'QuotiXX Carpintería';
            const telefono = localStorage.getItem('telefonoNegocio') || '';
            const direccion = localStorage.getItem('direccionNegocio') || '';

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
                    <p><strong>Cliente:</strong> ${datosCocina.cliente}${telefonoCliente ? ` (Tel: ${telefonoCliente})` : ''}</p>
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

            // 5. Guardar la cotización en el historial (no bloquea la descarga si falla)
            guardarEnHistorial({
                clienteNombre: cliente,
                clienteTelefono: telefonoCliente,
                tipoMueble: 'cocina',
                detalle: `Cocina ${datosCocina.disenoBajo || ''} - ${datosCocina.material || ''} ${datosCocina.color || ''}`.trim(),
                total: parseFloat((datosCocina.totalEstimado || '0').replace(/[^0-9]/g, '')) || 0
            });
        });
    }
});

// Guarda un registro de la cotización en el historial (Clientes + Historial quedan sincronizados)
function guardarEnHistorial(datos) {
    const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://quotixx-backend.onrender.com';
    fetch(`${baseUrl}/api/cotizaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    }).catch((err) => console.error('No se pudo guardar en el historial:', err));
}
