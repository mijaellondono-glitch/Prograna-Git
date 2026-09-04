const API_BASE_URL = 'https://quotixx-backend.onrender.com';

// ==========================================
// 0. PROTECCIÓN DE SESIÓN
// A) Si ya hay sesión y estás en el login, te manda directo a inicio.html.
// B) Si NO hay sesión y estás en una página interna (protegida),
//    te manda de vuelta al login. Así nadie entra con solo el link.
// ==========================================
(function protegerSesion() {
    const pagina = decodeURIComponent(window.location.pathname.split('/').pop() || '').toLowerCase();
    const usuarioLogueado = localStorage.getItem('usuarioLogueado');

    // Detecta páginas públicas por palabra clave, para no depender de
    // escribir tildes/ñ exactas (eso puede fallar según la codificación del archivo)
    const esPaginaPublica =
        pagina === '' ||
        pagina === 'index.html' ||
        pagina === 'registro.html' ||
        pagina.includes('contrase') || // nueva contraseña.html, Olvidaste_tu_contraseña.html
        pagina.includes('confirmar_codigo');

    if (esPaginaPublica) {
        // A) Ya logueado y está en el login -> mandarlo directo adentro
        if ((pagina === '' || pagina === 'index.html') && usuarioLogueado) {
            window.location.href = 'inicio.html';
        }
    } else {
        // B) Página interna sin sesión activa -> devolverlo al login
        if (!usuarioLogueado) {
            window.location.href = 'index.html';
        }
    }
})();

// ==========================================
// 1. MANEJO DEL REGISTRO DE USUARIO
// ==========================================
document.getElementById('formRegistro')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombreInput').value;
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    try {
        const respuesta = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            alert('¡Usuario registrado con éxito!');
            window.location.href = 'index.html';
        } else {
            alert(datos.mensaje || 'Error al registrar.');
        }
    } catch (error) {
        console.error('Error en la petición:', error);
        alert('No se pudo conectar con el servidor backend.');
    }
});

// ==========================================
// 2. MANEJO DEL LOGIN CON NOMBRE DE USUARIO
// ==========================================
document.getElementById('formLogin')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('usernameLogin').value.trim();
    const password = document.getElementById('passwordLogin').value;

    try {
        const respuesta = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, password })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            const usuarioObj = datos.user || datos.usuario;
            
            // Guarda el objeto completo del usuario
            localStorage.setItem('usuarioLogueado', JSON.stringify(usuarioObj));
            
            // 🔑 GUARDA EL EMAIL DIRECTAMENTE PARA LA PANTALLA DE CONFIGURACIÓN
            if (usuarioObj.email) {
                localStorage.setItem('usuarioEmail', usuarioObj.email);
            }

            alert(`¡Bienvenido/a, ${usuarioObj.nombre}!`);
            window.location.href = 'inicio.html';
        } else {
            alert(datos.message || datos.mensaje || 'Credenciales incorrectas.');
        }
    } catch (error) {
        console.error('Error al conectar:', error);
        alert('No se pudo conectar con el servidor backend.');
    }
});

// ==========================================
// 3. SOLICITAR CÓDIGO DE RECUPERACIÓN
// ==========================================
document.getElementById('formSolicitarCodigo')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('emailForgot').value;

    try {
        const respuesta = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            alert(datos.mensaje);
            // Oculta el primer formulario y muestra el formulario del código
            document.getElementById('formSolicitarCodigo').style.display = 'none';
            document.getElementById('formRestablecerPass').style.display = 'block';
            localStorage.setItem('emailRecuperacion', email);
        } else {
            alert(datos.mensaje || 'Error al enviar el código.');
        }
    } catch (error) {
        console.error('Error al conectar:', error);
        alert('No se pudo conectar con el servidor backend.');
    }
});

// ==========================================
// 4. RESTABLECER CONTRASEÑA
// ==========================================
document.getElementById('formRestablecerPass')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = localStorage.getItem('emailRecuperacion');
    const codigo = document.getElementById('codigoInput').value;
    const nuevaPassword = document.getElementById('nuevaPassInput').value;

    try {
        const respuesta = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, codigo, nuevaPassword })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            alert('¡Contraseña actualizada con éxito! Redirigiendo al Login...');
            localStorage.removeItem('emailRecuperacion');
            window.location.href = 'index.html';
        } else {
            alert(datos.mensaje || 'Error al cambiar la contraseña.');
        }
    } catch (error) {
        console.error('Error al conectar:', error);
        alert('No se pudo conectar con el servidor backend.');
    }
});