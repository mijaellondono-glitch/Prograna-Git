// Manejo del Registro
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
        alert('No se pudo conectar con el servidor.');
    }
});

// Manejo del Login con Nombre de Usuario
document.getElementById('formLogin')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('usernameLogin').value;
    const password = document.getElementById('passwordLogin').value;

    try {
        const respuesta = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, password })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            localStorage.setItem('usuarioLogueado', JSON.stringify(datos.usuario));
            alert(`¡Bienvenido/a, ${datos.usuario.nombre}!`);
            window.location.href = 'inicio.html';
        } else {
            alert(datos.mensaje || 'Credenciales incorrectas.');
        }
    } catch (error) {
        console.error('Error al conectar:', error);
        alert('No se pudo conectar con el servidor.');
    }
});