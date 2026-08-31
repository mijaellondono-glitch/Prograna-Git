// ==========================================
// 1. MANEJO DEL REGISTRO DE USUARIO
// ==========================================
document.getElementById('formRegistro')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombreInput').value;
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    try {
        const respuesta = await fetch('http://localhost:5000/api/auth/register', {
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
        const respuesta = await fetch('http://localhost:5000/api/auth/login', {
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
        const respuesta = await fetch('http://localhost:5000/api/auth/forgot-password', {
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
        const respuesta = await fetch('http://localhost:5000/api/auth/reset-password', {
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