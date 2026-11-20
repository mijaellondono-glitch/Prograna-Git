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
    // 0. PANTALLA DE CARGA (círculo giratorio con ícono flotante)
    // Se muestra sola cuando una petición tarda más de 0,7 s.
    // Los estilos se inyectan aquí para que funcione en cualquier pantalla.
    // ------------------------------------------
    function inyectarEstilos() {
        if (document.getElementById('qx-estilos')) return;
        const st = document.createElement('style');
        st.id = 'qx-estilos';
        st.textContent = `
        #qx-carga{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;
            background:rgba(48,28,10,.7);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);
            animation:qx-aparece .25s ease both;padding:20px}
        #qx-carga .qx-caja{display:flex;flex-direction:column;align-items:center;text-align:center;color:#fff;
            font:16px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:300px}
        #qx-carga .qx-orbita{position:relative;width:110px;height:110px;display:flex;align-items:center;justify-content:center}
        #qx-carga .qx-anillo{position:absolute;inset:0;border-radius:50%;border:6px solid rgba(255,240,215,.2);
            border-top-color:#d9a441;border-right-color:#f0c878;animation:qx-gira 1.1s linear infinite;
            box-shadow:0 0 24px rgba(217,164,65,.4)}
        #qx-carga .qx-anillo2{position:absolute;inset:14px;border-radius:50%;border:4px solid transparent;
            border-bottom-color:#c0793a;border-left-color:#e0a46a;animation:qx-gira 1.7s linear infinite reverse}
        #qx-carga .qx-icono{position:relative;width:48px;height:48px;animation:qx-flota 1.8s ease-in-out infinite;filter:drop-shadow(0 6px 6px rgba(0,0,0,.4))}
        #qx-carga .qx-icono b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:400;opacity:0;animation:qx-herr 3.2s ease-in-out infinite}
        #qx-carga .qx-icono b:nth-child(2){animation-delay:.8s}#qx-carga .qx-icono b:nth-child(3){animation-delay:1.6s}#qx-carga .qx-icono b:nth-child(4){animation-delay:2.4s}
        #qx-carga .qx-tabla{width:170px;height:10px;border-radius:6px;margin-top:16px;overflow:hidden;background:#6b4423;box-shadow:inset 0 2px 3px rgba(0,0,0,.45)}
        #qx-carga .qx-tabla i{display:block;width:40%;height:100%;border-radius:6px;background:linear-gradient(90deg,#f0c878,#d9a441);animation:qx-lija 1.3s ease-in-out infinite}
        #qx-carga .qx-texto{margin:18px 0 0;font-weight:700;font-size:18px;letter-spacing:.2px}
        #qx-carga .qx-sub{margin:8px 0 0;font-size:13.5px;opacity:.9;min-height:1.2em}
        #qx-carga .qx-puntos{display:flex;gap:7px;margin-top:14px}
        #qx-carga .qx-puntos i{width:9px;height:9px;border-radius:50%;background:#d9a441;animation:qx-rebota 1s ease-in-out infinite}
        #qx-carga .qx-puntos i:nth-child(2){animation-delay:.15s;background:#c0793a}
        #qx-carga .qx-puntos i:nth-child(3){animation-delay:.3s;background:#f0c878}
        @keyframes qx-gira{to{transform:rotate(360deg)}}
        @keyframes qx-flota{0%,100%{transform:translateY(4px) rotate(-6deg)}50%{transform:translateY(-8px) rotate(6deg)}}
        @keyframes qx-rebota{0%,100%{transform:translateY(0);opacity:.55}50%{transform:translateY(-7px);opacity:1}}
        @keyframes qx-herr{0%{opacity:0;transform:scale(.6) rotate(-25deg)}8%,22%{opacity:1;transform:scale(1) rotate(0)}30%,100%{opacity:0;transform:scale(.6) rotate(25deg)}}
        @keyframes qx-lija{0%{transform:translateX(-110%)}100%{transform:translateX(260%)}}
        @keyframes qx-aparece{from{opacity:0}to{opacity:1}}
        @media (prefers-reduced-motion:reduce){#qx-carga *{animation-duration:3s!important}}
        `;
        document.head.appendChild(st);
    }

    let cargasActivas = 0;

    // Muestra (o actualiza) la pantalla de carga. Devuelve una función para liberarla.
    function iniciarCarga(texto, sub) {
        cargasActivas++;
        pintarCarga(texto, sub);
        let liberada = false;
        return function liberar() {
            if (liberada) return;
            liberada = true;
            cargasActivas = Math.max(0, cargasActivas - 1);
            if (cargasActivas === 0) {
                const el = document.getElementById('qx-carga');
                if (el) el.remove();
            }
        };
    }

    function pintarCarga(texto, sub) {
        const montar = () => {
            inyectarEstilos();
            let el = document.getElementById('qx-carga');
            if (!el) {
                el = document.createElement('div');
                el.id = 'qx-carga';
                el.setAttribute('role', 'status');
                el.setAttribute('aria-live', 'polite');
                el.innerHTML =
                    '<div class="qx-caja"><div class="qx-orbita"><span class="qx-anillo"></span>' +
                    '<span class="qx-anillo2"></span><span class="qx-icono"><b>🪚</b><b>🔨</b><b>📏</b><b>🪵</b></span></div>' +
                    '<p class="qx-texto"></p><p class="qx-sub"></p>' +
                    '<div class="qx-tabla"><i></i></div><div class="qx-puntos"><i></i><i></i><i></i></div></div>';
                document.body.appendChild(el);
            }
            el.querySelector('.qx-texto').textContent = texto || 'Cargando…';
            el.querySelector('.qx-sub').textContent = sub || '';
        };
        if (document.body) montar();
        else document.addEventListener('DOMContentLoaded', montar);
    }

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
        const c = Object.assign({ intentos: 3, timeoutMs: 60000, esperaMs: 3000, avisar: true, textoCarga: 'Cargando…' }, config || {});
        const opts = opciones || {};
        const metodo = (opts.method || 'GET').toUpperCase();
        let ultimoError;

        // Pantalla de carga: aparece si la petición tarda más de 0,7 s; si pasa de
        // 4,5 s se explica que el servidor puede estar despertando (Render gratis).
        let liberarCarga = null;
        const temporizadorCarga = c.avisar
            ? setTimeout(() => { liberarCarga = iniciarCarga(c.textoCarga); }, 700)
            : null;
        const temporizadorMensaje = c.avisar
            ? setTimeout(() => {
                if (liberarCarga) pintarCarga(c.textoCarga, 'Conectando con el servidor… la primera vez puede tardar hasta un minuto. No cierres la app.');
            }, 4500)
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
            if (temporizadorCarga) clearTimeout(temporizadorCarga);
            if (temporizadorMensaje) clearTimeout(temporizadorMensaje);
            if (liberarCarga) liberarCarga();
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
            }, { timeoutMs: 90000, textoCarga: 'Generando tu cotización…' });
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

    // ------------------------------------------
    // 5. DATOS DEL NEGOCIO (nombre, teléfono, correo, dirección y logo)
    // Se bajan del servidor y se guardan en el teléfono, porque de ahí los toman
    // los PDF. Se ejecuta sola en la pantalla de inicio (después de iniciar sesión),
    // así los PDF salen completos aunque nunca se abra Configuración.
    // ------------------------------------------
    async function sincronizarNegocio() {
        try {
            const email = localStorage.getItem('usuarioEmail');
            if (!email) return;
            const res = await apiFetch(apiBase() + '/api/auth/configuracion/' + encodeURIComponent(email),
                {}, { avisar: false, intentos: 2 });
            if (!res.ok) return;
            const d = await res.json();
            ['nombreNegocio', 'telefonoNegocio', 'correoNegocio', 'direccionNegocio', 'logoNegocio'].forEach((k) => {
                if (d[k]) { try { localStorage.setItem(k, d[k]); } catch (e) { } }
            });
            if (d.logoNegocio) { try { localStorage.setItem('logoFondoBlanco', d.logoFondoBlanco ? '1' : '0'); } catch (e) { } }
            try {
                if (d.colorPdf) localStorage.setItem('colorPdf', d.colorPdf); else localStorage.removeItem('colorPdf');
                if (d.colorAcento) localStorage.setItem('colorAcento', d.colorAcento); else localStorage.removeItem('colorAcento');
            } catch (e) { }
        } catch (e) { /* sin conexión: se usan los datos guardados en el teléfono */ }
    }
    document.addEventListener('DOMContentLoaded', () => {
        if (/inicio\.html$/.test(location.pathname)) sincronizarNegocio();
    });

    // ------------------------------------------
    // Onda al tocar un botón (efecto visual; el estilo está en css/Tema.css)
    // ------------------------------------------
    document.addEventListener('pointerdown', (e) => {
        const b = e.target.closest && e.target.closest('button');
        if (!b || b.disabled) return;
        const r = b.getBoundingClientRect();
        const d = Math.max(r.width, r.height);
        const o = document.createElement('span');
        o.className = 'qx-onda';
        o.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px;';
        b.appendChild(o);
        setTimeout(() => o.remove(), 650);
    }, { passive: true });

    window.Quotixx = { mostrarAviso, ocultarAviso, confirmar, apiFetch, despertarServidor, entregarPdf, generarPdf, iniciarCarga, sincronizarNegocio };
})();
