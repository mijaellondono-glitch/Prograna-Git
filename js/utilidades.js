// ==========================================
// ARCHIVO: js/utilidades.js
// Descripción: Ayudas para que Quotixx funcione igual de bien dentro del
// APK (WebView de Android) que en el navegador. Se carga ANTES de main.js.
//
// Resuelve 4 problemas del WebView:
//  1) alert() y confirm() no funcionan  -> avisos y diálogos propios (HTML)
//  2) El servidor de Render "se duerme" -> despertarlo al abrir + reintentos
//  3) Descargar PDF con <a download>    -> se entrega a la app Android
//  4) Doble clic = acciones duplicadas  -> el botón se bloquea mientras trabaja
// ==========================================
(function () {
    'use strict';

    const URL_RESPALDO = 'https://quotixx-backend.onrender.com';
    const apiBase = () => (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : URL_RESPALDO);
    const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

    // ------------------------------------------
    // 1A. AVISOS (reemplazo de alert)
    // Muestra un mensaje flotante. Si la página cambia justo después
    // (ej: "¡Bienvenido!" y redirige), el aviso se vuelve a mostrar
    // en la página nueva para que se alcance a leer.
    // ------------------------------------------
    const CLAVE_PENDIENTE = 'qx_aviso_pendiente';

    function contenedorAvisos() {
        let c = document.getElementById('qx-avisos');
        if (!c) {
            c = document.createElement('div');
            c.id = 'qx-avisos';
            c.setAttribute('role', 'status');
            c.setAttribute('aria-live', 'polite');
            c.style.cssText =
                'position:fixed;left:0;right:0;bottom:16px;z-index:99998;display:flex;' +
                'flex-direction:column;align-items:center;gap:8px;padding:0 16px;pointer-events:none;';
            (document.body || document.documentElement).appendChild(c);
        }
        return c;
    }

    function mostrarAviso(texto, opciones) {
        const o = opciones || {};
        const iniciar = () => {
            const cont = contenedorAvisos();
            if (o.id) {
                const previo = cont.querySelector('[data-id="' + o.id + '"]');
                if (previo) previo.remove();
            }
            const el = document.createElement('div');
            if (o.id) el.dataset.id = o.id;
            el.textContent = String(texto);
            el.style.cssText =
                'max-width:420px;width:100%;box-sizing:border-box;background:#222;color:#fff;' +
                'padding:12px 16px;border-radius:10px;font:15px/1.35 system-ui,sans-serif;' +
                'box-shadow:0 4px 14px rgba(0,0,0,.35);white-space:pre-line;pointer-events:auto;';
            cont.appendChild(el);
            if (!o.fijo) setTimeout(() => el.remove(), o.duracion || 4500);
        };
        if (document.body) iniciar();
        else document.addEventListener('DOMContentLoaded', iniciar);
    }

    function ocultarAviso(id) {
        const el = document.querySelector('#qx-avisos [data-id="' + id + '"]');
        if (el) el.remove();
    }

    // alert() ahora usa el aviso flotante (no bloquea, pero funciona en el APK)
    window.alert = function (mensaje) {
        mostrarAviso(mensaje);
        try {
            sessionStorage.setItem(CLAVE_PENDIENTE, JSON.stringify({ t: Date.now(), m: String(mensaje) }));
            // Si la página NO cambia, el aviso pendiente se descarta solo
            setTimeout(() => { try { sessionStorage.removeItem(CLAVE_PENDIENTE); } catch (e) { } }, 1500);
        } catch (e) { /* sin sessionStorage: no pasa nada */ }
    };

    document.addEventListener('DOMContentLoaded', () => {
        try {
            const crudo = sessionStorage.getItem(CLAVE_PENDIENTE);
            if (!crudo) return;
            sessionStorage.removeItem(CLAVE_PENDIENTE);
            const p = JSON.parse(crudo);
            if (p && Date.now() - p.t < 4000) mostrarAviso(p.m);
        } catch (e) { }
    });

    // ------------------------------------------
    // 1B. CONFIRMACIÓN (reemplazo de confirm)
    // Uso:  if (!(await Quotixx.confirmar('¿Seguro?'))) return;
    // ------------------------------------------
    function confirmar(mensaje, textoSi, textoNo) {
        return new Promise((resolver) => {
            const fondo = document.createElement('div');
            fondo.style.cssText =
                'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;' +
                'align-items:center;justify-content:center;padding:16px;';
            const caja = document.createElement('div');
            caja.setAttribute('role', 'dialog');
            caja.setAttribute('aria-modal', 'true');
            caja.style.cssText =
                'background:#fff;color:#222;max-width:380px;width:100%;box-sizing:border-box;' +
                'border-radius:12px;padding:20px;font:16px/1.4 system-ui,sans-serif;' +
                'box-shadow:0 10px 30px rgba(0,0,0,.4);';
            const texto = document.createElement('p');
            texto.textContent = mensaje;
            texto.style.cssText = 'margin:0 0 18px;white-space:pre-line;';
            const fila = document.createElement('div');
            fila.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';

            const crearBoton = (etiqueta, estilo, valor) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.textContent = etiqueta;
                b.style.cssText =
                    'padding:10px 18px;border-radius:8px;border:0;font-size:15px;cursor:pointer;' + estilo;
                b.addEventListener('click', () => { fondo.remove(); resolver(valor); });
                return b;
            };
            fila.appendChild(crearBoton(textoNo || 'Cancelar', 'background:#e5e5e5;color:#222;', false));
            fila.appendChild(crearBoton(textoSi || 'Aceptar', 'background:#b00020;color:#fff;', true));
            caja.appendChild(texto);
            caja.appendChild(fila);
            fondo.appendChild(caja);
            document.body.appendChild(fondo);
        });
    }

    // ------------------------------------------
    // 2. CONEXIÓN CON EL SERVIDOR (Render gratis se duerme tras ~15 min)
    // apiFetch = fetch + tiempo máximo + reintentos si el servidor está
    // despertando (error de red, 502, 503 o 504).
    // ------------------------------------------
    async function apiFetch(url, opciones, config) {
        const c = Object.assign({ intentos: 3, timeoutMs: 60000, esperaMs: 3000, avisar: true }, config || {});
        const opts = opciones || {};
        const metodo = (opts.method || 'GET').toUpperCase();
        let ultimoError;

        const temporizadorAviso = c.avisar
            ? setTimeout(() => mostrarAviso(
                'Conectando con el servidor…\nLa primera vez puede tardar hasta un minuto. No cierres la app.',
                { id: 'qx-conexion', fijo: true }), 4000)
            : null;

        try {
            for (let i = 1; i <= c.intentos; i++) {
                const control = new AbortController();
                const corte = setTimeout(() => control.abort(), c.timeoutMs);
                try {
                    const res = await fetch(url, Object.assign({}, opts, { signal: control.signal }));
                    clearTimeout(corte);
                    if ([502, 503, 504].includes(res.status) && i < c.intentos) {
                        await esperar(c.esperaMs * i);
                        continue;
                    }
                    return res;
                } catch (err) {
                    clearTimeout(corte);
                    ultimoError = err;
                    // Si se acabó el tiempo en una petición que escribe datos, no se repite
                    // (el servidor podría haberla procesado y se duplicaría).
                    if (err && err.name === 'AbortError' && metodo !== 'GET') break;
                    if (i < c.intentos) await esperar(c.esperaMs * i);
                }
            }
            throw ultimoError || new Error('Sin respuesta del servidor');
        } finally {
            if (temporizadorAviso) clearTimeout(temporizadorAviso);
            ocultarAviso('qx-conexion');
        }
    }

    // Despierta el servidor apenas se abre cualquier pantalla (no espera respuesta)
    function despertarServidor() {
        try { fetch(apiBase() + '/', { mode: 'no-cors', cache: 'no-store' }).catch(() => { }); } catch (e) { }
    }
    document.addEventListener('DOMContentLoaded', despertarServidor);

    // ------------------------------------------
    // 3. ENTREGA DE PDF
    // - En el APK: se manda a la app Android (puente QuotixxAndroid) que lo
    //   guarda en Descargas y lo abre.
    // - En un navegador normal: descarga clásica.
    // ------------------------------------------
    function blobABase64(blob) {
        return new Promise((resolver, rechazar) => {
            const lector = new FileReader();
            lector.onload = () => resolver(String(lector.result).split(',')[1] || '');
            lector.onerror = () => rechazar(lector.error);
            lector.readAsDataURL(blob);
        });
    }

    async function entregarPdf(blob, nombreArchivo) {
        const puente = window.QuotixxAndroid;
        if (puente && typeof puente.guardarPdf === 'function') {
            puente.guardarPdf(await blobABase64(blob), nombreArchivo);
            return;
        }
        // Dentro de un WebView ("; wv)") sin puente, la descarga no se puede hacer
        if (/; wv\)/.test(navigator.userAgent)) {
            const err = new Error('sin puente Android');
            err.mensajeUsuario = 'Esta versión del APK todavía no puede guardar PDF.\nActualiza MainActivity.kt y vuelve a generar el APK.';
            throw err;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    // Pide el PDF al servidor y lo entrega. Bloquea el botón mientras trabaja
    // para evitar los "montones de clics" (cada clic creaba otra cotización).
    async function generarPdf(config) {
        const boton = config.boton || null;
        const textoOriginal = boton ? boton.textContent : '';
        if (boton) {
            if (boton.disabled) return;
            boton.disabled = true;
            boton.textContent = '⏳ Generando PDF…';
        }
        try {
            const res = await apiFetch(apiBase() + config.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config.payload)
            }, { timeoutMs: 90000 });
            if (!res.ok) throw new Error('El servidor respondió con error ' + res.status);
            const blob = await res.blob();
            await entregarPdf(blob, config.nombreArchivo);
        } finally {
            if (boton) {
                boton.disabled = false;
                boton.textContent = textoOriginal;
            }
        }
    }

    window.Quotixx = { mostrarAviso, ocultarAviso, confirmar, apiFetch, despertarServidor, entregarPdf, generarPdf };
})();
