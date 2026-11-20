// ==========================================
// Utilidades del logo del negocio para los PDF
// El logo llega desde la app como una imagen PNG en base64 ("data URL").
// ==========================================
const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_CARACTERES = 700 * 1024;

// Convierte "data:image/png;base64,...." en un Buffer. Si no es un PNG válido devuelve null.
function logoDesdeDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || dataUrl.length === 0 || dataUrl.length > MAX_CARACTERES) return null;
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length < 33 || !buf.subarray(0, 8).equals(FIRMA_PNG)) return null;
  return buf;
}

// Para guardar: se acepta '' (quitar el logo) o un PNG válido
function esLogoValido(dataUrl) {
  return dataUrl === '' || logoDesdeDataUrl(dataUrl) !== null;
}

// Dibuja el logo en la esquina derecha del encabezado azul (que mide 95 px de alto).
// Devuelve true si lo dibujó. Si algo falla, el PDF se genera igual, solo sin logo.
function pintarLogoNegocio(doc, body) {
  try {
    const buf = logoDesdeDataUrl(body && body.logoNegocio);
    if (!buf) return false;

    const ancho = buf.readUInt32BE(16);   // el PNG guarda su tamaño en el bloque IHDR
    const alto = buf.readUInt32BE(20);
    if (!ancho || !alto) return false;

    const MAX_W = 150, MAX_H = 62, BORDE_DERECHO = 555, Y_SUPERIOR = 16;
    const escala = Math.min(MAX_W / ancho, MAX_H / alto);
    const w = ancho * escala;
    const h = alto * escala;
    const x = BORDE_DERECHO - w;
    const y = Y_SUPERIOR + (MAX_H - h) / 2;

    doc.save();
    if (body.logoFondoBlanco === true) {
      doc.fillColor('#FFFFFF').roundedRect(x - 6, y - 5, w + 12, h + 10, 6).fill();
    }
    doc.image(buf, x, y, { width: w, height: h });
    doc.restore();
    return true;
  } catch (error) {
    console.error('No se pudo dibujar el logo en el PDF:', error.message);
    return false;
  }
}

// ------------------------------------------
// Paleta de colores del PDF
// Por defecto: café, beige y hueso. Si el negocio subió un logo, la app
// manda el color principal y el de acento sacados del logo (colorPdf / colorAcento).
// ------------------------------------------
const PALETA_BASE = { principal: '#8b5a2b', acento: '#d9a441' };
const esHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
const aRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const aHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mezclar = (c, con, t) => c.map((v, i) => v + (con[i] - v) * t);   // t=0 → c, t=1 → con
function luminancia(c) {
  const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
}

// Devuelve todos los colores que usa el PDF a partir del cuerpo de la petición.
function paletaPdf(body) {
  let principal = aRgb(esHex(body && body.colorPdf) ? body.colorPdf : PALETA_BASE.principal);
  // El texto del encabezado es blanco: si el color es muy claro se oscurece hasta que se lea
  for (let i = 0; i < 12 && luminancia(principal) > 0.2; i++) principal = mezclar(principal, [0, 0, 0], 0.12);
  const acento = aRgb(esHex(body && body.colorAcento) ? body.colorAcento : PALETA_BASE.acento);
  const blanco = [255, 255, 255];
  return {
    principal: aHex(principal),
    oscuro: aHex(mezclar(principal, [0, 0, 0], 0.4)),
    claro: aHex(mezclar(principal, blanco, 0.9)),     // caja del total
    borde: aHex(mezclar(principal, blanco, 0.65)),
    fila: aHex(mezclar(principal, blanco, 0.95)),     // filas alternas de la tabla
    acento: aHex(acento)
  };
}

module.exports = { logoDesdeDataUrl, esLogoValido, pintarLogoNegocio, paletaPdf, esHex, MAX_CARACTERES };
