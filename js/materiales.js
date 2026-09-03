// ==========================================
// 🔍 FILTRO DE BÚSQUEDA: materiales.html
// Filtra los <article class="material-item"> dentro de cada
// <details class="categoria-group"> según el texto buscado.
// ==========================================

function filtrarMateriales() {
    const texto = document.getElementById('buscarMaterial').value.trim().toLowerCase();
    const grupos = document.querySelectorAll('.categoria-group');
    const noResults = document.getElementById('noResults');
    let algunoVisible = false;

    grupos.forEach(grupo => {
        const items = grupo.querySelectorAll('.material-item');
        let algunoEnGrupo = false;

        items.forEach(item => {
            const coincide = item.textContent.toLowerCase().includes(texto);
            item.style.display = coincide ? '' : 'none';
            if (coincide) algunoEnGrupo = true;
        });

        // Si hay búsqueda activa, solo mostramos el grupo (y lo abrimos) si tiene resultados
        if (texto === '') {
            grupo.style.display = '';
        } else {
            grupo.style.display = algunoEnGrupo ? '' : 'none';
            grupo.open = algunoEnGrupo;
        }

        if (algunoEnGrupo || texto === '') algunoVisible = true;
    });

    if (noResults) {
        noResults.style.display = (texto !== '' && !algunoVisible) ? 'block' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('noResults')) {
        document.getElementById('noResults').style.display = 'none';
    }
});
