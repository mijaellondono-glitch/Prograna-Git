// ==========================================
// 🗂️ CATÁLOGO: listar y buscar productos por categoría
// Se usa en catalogo-puertas.html, catalogo-comedores.html,
// catalogo-cocinas.html, catalogo-closets.html, catalogo-camas.html
// ==========================================

// Cada página define estas 3 cosas antes de cargar este script:
// window.CATALOGO_CATEGORIA, window.CATALOGO_CONTENEDOR, window.CATALOGO_BUSCADOR

document.addEventListener('DOMContentLoaded', async () => {
    const categoria = window.CATALOGO_CATEGORIA;
    const contenedor = document.getElementById(window.CATALOGO_CONTENEDOR);
    const buscador = document.getElementById(window.CATALOGO_BUSCADOR);

    if (!categoria || !contenedor) return;

    const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://quotixx-backend.onrender.com';
    let productos = [];

    function renderizar(lista) {
        if (lista.length === 0) {
            contenedor.innerHTML = '<p style="text-align:center;">No hay productos registrados todavía en esta categoría.</p>';
            return;
        }

        contenedor.innerHTML = lista.map(p => `
            <div class="tarjeta-producto" style="border:1px solid #ddd; border-radius:8px; padding:12px; margin-bottom:14px; display:flex; gap:12px; align-items:flex-start;">
                <img src="${baseUrl}${p.imagenUrl}" alt="${p.nombre}" style="width:100px; height:100px; object-fit:cover; border-radius:6px; flex-shrink:0;">
                <div style="flex:1;">
                    <h4 style="margin:0 0 4px 0;">${p.nombre}</h4>
                    <p style="margin:0 0 4px 0; font-size:0.9rem; color:#555;">${p.descripcion}</p>
                    <p style="margin:0; font-weight:bold; color:#004085;">$${Number(p.precio).toLocaleString('es-CO')} COP</p>
                </div>
                <button type="button" data-id="${p._id}" class="btnEliminarProducto" style="background:#b00020; color:white; border:none; border-radius:4px; padding:6px 10px; cursor:pointer; height:fit-content;">🗑️</button>
            </div>
        `).join('');

        contenedor.querySelectorAll('.btnEliminarProducto').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('¿Eliminar este producto del catálogo?')) return;
                try {
                    const res = await fetch(`${baseUrl}/api/productos/${btn.dataset.id}`, { method: 'DELETE' });
                    if (res.ok) {
                        productos = productos.filter(p => p._id !== btn.dataset.id);
                        renderizar(productos);
                    } else {
                        alert('No se pudo eliminar el producto.');
                    }
                } catch (err) {
                    alert('Error al conectar con el servidor.');
                }
            });
        });
    }

    async function cargarProductos() {
        contenedor.innerHTML = '<p style="text-align:center;">Cargando...</p>';
        try {
            const res = await fetch(`${baseUrl}/api/productos?categoria=${categoria}`);
            productos = res.ok ? await res.json() : [];
        } catch (err) {
            productos = [];
            console.error('Error al cargar productos:', err);
        }
        renderizar(productos);
    }

    if (buscador) {
        buscador.addEventListener('input', () => {
            const texto = buscador.value.trim().toLowerCase();
            const filtrados = productos.filter(p =>
                p.nombre.toLowerCase().includes(texto) || p.descripcion.toLowerCase().includes(texto)
            );
            renderizar(filtrados);
        });
    }

    cargarProductos();
});
