// ==========================================
// ARCHIVO: js/logo.js
// Descripción: Prepara el logo del negocio para los PDF.
//  - Lo reduce de tamaño (máximo 420 px) para que pese poco.
//  - Le quita el fondo blanco (lo vuelve transparente) con bordes suaves.
//  - Recorta los espacios vacíos de alrededor.
// Todo se hace en el propio teléfono / navegador, sin enviar la imagen a ningún lado
// hasta que se pulsa "Guardar cambios".
// ==========================================
(function () {
    'use strict';

    const LADO_MAXIMO = 420;          // px
    const MAX_CARACTERES = 380000;    // ~280 KB en base64: el servidor acepta hasta ~700 KB

    function cargarImagen(archivo) {
        return new Promise((resolver, rechazar) => {
            const url = URL.createObjectURL(archivo);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolver(img); };
            img.onerror = () => { URL.revokeObjectURL(url); rechazar(new Error('No se pudo leer la imagen')); };
            img.src = url;
        });
    }

    // Distancia de color entre un píxel y el color de fondo
    function distancia(d, i, fondo) {
        const dr = d[i] - fondo[0], dg = d[i + 1] - fondo[1], db = d[i + 2] - fondo[2];
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    // Detecta el color de fondo mirando las 4 esquinas.
    // Devuelve null si la imagen ya es transparente en las esquinas o si no hay un fondo uniforme.
    function detectarFondo(d, w, h) {
        const esquinas = [0, (w - 1), (h - 1) * w, (h - 1) * w + (w - 1)].map((p) => p * 4);
        if (esquinas.every((i) => d[i + 3] < 20)) return { transparente: true };
        const colores = esquinas.filter((i) => d[i + 3] >= 20).map((i) => [d[i], d[i + 1], d[i + 2]]);
        const prom = [0, 1, 2].map((k) => Math.round(colores.reduce((s, c) => s + c[k], 0) / colores.length));
        const dispersion = Math.max(...colores.map((c) => Math.hypot(c[0] - prom[0], c[1] - prom[1], c[2] - prom[2])));
        if (dispersion > 45) return null;   // las esquinas no tienen el mismo color: no hay fondo liso
        // Solo se quitan fondos claros (blanco o casi blanco). Un logo con fondo de color
        // (por ejemplo café) se deja tal cual: ese color es parte del logo.
        if (Math.min(prom[0], prom[1], prom[2]) < 190) return null;
        return { color: prom };
    }

    // Quita el fondo. Si "todos" es falso, solo se quita el fondo que toca los bordes
    // (los blancos de adentro del dibujo se conservan).
    function quitarFondo(imagen, tolerancia, todos) {
        const { data: d, width: w, height: h } = imagen;
        const fondo = detectarFondo(d, w, h);
        if (!fondo) return { aplicado: false, motivo: 'sin-fondo-liso' };
        if (fondo.transparente) return { aplicado: false, motivo: 'ya-transparente' };

        const bg = fondo.color;
        const esFondo = new Uint8Array(w * h);

        if (todos) {
            for (let p = 0; p < w * h; p++) if (distancia(d, p * 4, bg) <= tolerancia) esFondo[p] = 1;
        } else {
            const pila = [];
            const intentar = (x, y) => {
                const p = y * w + x;
                if (esFondo[p] || distancia(d, p * 4, bg) > tolerancia) return;
                esFondo[p] = 1; pila.push(p);
            };
            for (let x = 0; x < w; x++) { intentar(x, 0); intentar(x, h - 1); }
            for (let y = 0; y < h; y++) { intentar(0, y); intentar(w - 1, y); }
            while (pila.length) {
                const p = pila.pop(); const x = p % w, y = (p - x) / w;
                if (x > 0) intentar(x - 1, y);
                if (x < w - 1) intentar(x + 1, y);
                if (y > 0) intentar(x, y - 1);
                if (y < h - 1) intentar(x, y + 1);
            }
        }

        // Borde suave: los píxeles que tocan el fondo (hasta 2 px) son mezcla de dibujo y blanco.
        // Se calcula cuánto es dibujo (alfa) y se recupera su color real para evitar el "halo" blanco.
        const dist = new Uint8Array(w * h);            // 0 = no es borde, 1..2 = distancia al fondo
        let frontera = [];
        for (let p = 0; p < w * h; p++) {
            if (esFondo[p]) continue;
            const x = p % w, y = (p - x) / w;
            if ((x > 0 && esFondo[p - 1]) || (x < w - 1 && esFondo[p + 1]) || (y > 0 && esFondo[p - w]) || (y < h - 1 && esFondo[p + w])) {
                dist[p] = 1; frontera.push(p);
            }
        }
        const segunda = [];
        for (const p of frontera) {
            const x = p % w, y = (p - x) / w;
            [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([nx, ny]) => {
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
                const q = ny * w + nx;
                if (!esFondo[q] && !dist[q]) { dist[q] = 2; segunda.push(q); }
            });
        }

        for (let p = 0; p < w * h; p++) {
            const i = p * 4;
            if (esFondo[p]) { d[i + 3] = 0; continue; }
            if (!dist[p]) continue;
            let a = 0;
            for (let k = 0; k < 3; k++) {
                const c = d[i + k], b = bg[k];
                let ak = 0;
                if (c < b) ak = b > 0 ? (b - c) / b : 0;
                else if (c > b) ak = b < 255 ? (c - b) / (255 - b) : 0;
                if (ak > a) a = ak;
            }
            if (a < 0.03) { d[i + 3] = 0; continue; }
            if (a > 1) a = 1;
            for (let k = 0; k < 3; k++) {
                const v = bg[k] + (d[i + k] - bg[k]) / a;
                d[i + k] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
            }
            d[i + 3] = Math.round(a * d[i + 3]);
        }
        return { aplicado: true };
    }

    // Recorta los bordes vacíos (transparentes) con un pequeño margen
    function recortar(canvas) {
        const ctx = canvas.getContext('2d');
        const { width: w, height: h } = canvas;
        const d = ctx.getImageData(0, 0, w, h).data;
        let x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (d[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
        if (x1 < 0) return canvas;                       // todo transparente: se deja igual
        const m = 2;
        x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m);
        const out = document.createElement('canvas');
        out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
        out.getContext('2d').drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
        return out;
    }

    // Prepara el logo a partir de una imagen ya cargada.
    // opciones: { quitarFondo: true/false, tolerancia: 10..120, todos: true/false }
    function procesarImagen(img, opciones) {
        const o = Object.assign({ quitarFondo: true, tolerancia: 45, todos: false }, opciones || {});
        let escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
        for (let intento = 0; intento < 5; intento++) {
            const w = Math.max(1, Math.round((img.naturalWidth || img.width) * escala));
            const h = Math.max(1, Math.round((img.naturalHeight || img.height) * escala));
            const lienzo = document.createElement('canvas');
            lienzo.width = w; lienzo.height = h;
            const ctx = lienzo.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, w, h);
            let resultado = { aplicado: false, motivo: 'desactivado' };
            if (o.quitarFondo) {
                const datos = ctx.getImageData(0, 0, w, h);
                resultado = quitarFondo(datos, o.tolerancia, o.todos);
                if (resultado.aplicado) ctx.putImageData(datos, 0, 0);
            }
            const final = recortar(lienzo);
            const dataUrl = final.toDataURL('image/png');
            if (dataUrl.length <= MAX_CARACTERES || intento === 4) {
                return { dataUrl, ancho: final.width, alto: final.height, fondoQuitado: resultado.aplicado, motivo: resultado.motivo };
            }
            escala *= 0.75;     // pesa demasiado: se reduce y se repite
        }
    }

    async function procesarArchivo(archivo, opciones) {
        const img = await cargarImagen(archivo);
        return procesarImagen(img, opciones);
    }

    // ------------------------------------------
    // Colores del logo: busca el color principal y el de acento.
    // Ignora blancos, casi blancos y grises (no sirven para un encabezado).
    // Devuelve { principal:'#rrggbb', acento:'#rrggbb' } o null si el logo no tiene color útil
    // (en ese caso el PDF usa el café por defecto).
    // ------------------------------------------
    function aHex(r, g, b) { return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''); }

    function hsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
        const d = mx - mn;
        const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
        return { s, l };
    }

    function extraerPaleta(dataUrl) {
        return new Promise((resolver) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const lado = 80;
                    const esc = Math.min(1, lado / Math.max(img.width, img.height));
                    const w = Math.max(1, Math.round(img.width * esc)), h = Math.max(1, Math.round(img.height * esc));
                    const c = document.createElement('canvas'); c.width = w; c.height = h;
                    const ctx = c.getContext('2d', { willReadFrequently: true });
                    ctx.drawImage(img, 0, 0, w, h);
                    const d = ctx.getImageData(0, 0, w, h).data;
                    const grupos = new Map();          // color aproximado -> { n, r, g, b }
                    let total = 0;
                    for (let i = 0; i < d.length; i += 4) {
                        if (d[i + 3] < 200) continue;                   // transparente
                        total++;
                        const k = (d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4);
                        const g = grupos.get(k) || { n: 0, r: 0, g: 0, b: 0 };
                        g.n++; g.r += d[i]; g.g += d[i + 1]; g.b += d[i + 2];
                        grupos.set(k, g);
                    }
                    if (!total) return resolver(null);
                    const lista = Array.from(grupos.values()).map((g) => {
                        const r = g.r / g.n, gg = g.g / g.n, b = g.b / g.n;
                        return { n: g.n, r, g: gg, b, ...hsl(r, gg, b) };
                    });
                    // Principal: el color con tono (no gris) más frecuente. Los muy claros se descartan.
                    const colorido = lista.filter((x) => x.s >= 0.22 && x.l > 0.1 && x.l < 0.85).sort((a, b) => b.n - a.n);
                    if (!colorido.length || colorido[0].n < total * 0.03) return resolver(null);
                    const p = colorido[0];
                    // Acento: el siguiente más frecuente que se distinga del principal
                    // (puede ser oscuro como el negro, pero no blanco)
                    const dist = (a, b) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
                    const otros = lista.filter((x) => x.l < 0.9 && dist(x, p) > 70 && x.n >= total * 0.02).sort((a, b) => b.n - a.n);
                    const a = otros[0];
                    resolver({
                        principal: aHex(p.r, p.g, p.b),
                        acento: a ? aHex(a.r, a.g, a.b) : ''
                    });
                } catch (e) { resolver(null); }
            };
            img.onerror = () => resolver(null);
            img.src = dataUrl;
        });
    }

    window.QuotixxLogo = { procesarArchivo, procesarImagen, cargarImagen, extraerPaleta };
})();
