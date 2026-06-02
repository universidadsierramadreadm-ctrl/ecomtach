/* ECOMATCH — js/publicaciones-editar.js v2 */
'use strict';

const API    = 'http://localhost:3000/api';
const token  = sessionStorage.getItem('token');
const nombre = sessionStorage.getItem('nombre');

if (!token) window.location.href = 'login.html';

document.getElementById('nombreNav').textContent = nombre || '';

const params = new URLSearchParams(window.location.search);
const id     = params.get('id');
if (!id) window.location.href = 'publicaciones.html';

function mostrarAlerta(msg, tipo) {
  const el = document.getElementById('alerta');
  el.textContent = msg;
  el.className = 'alerta ' + tipo;
}

function cerrarSesion() {
  sessionStorage.clear();
  window.location.href = 'login.html';
}

function cargarDatos() {
  fetch(API + '/products/' + id, {
    headers: { 'Authorization': 'Bearer ' + token }
  })
    .then(function(res) {
      if (res.status === 401) { sessionStorage.clear(); window.location.href = 'login.html'; return null; }
      return res.json();
    })
    .then(function(data) {
      if (!data) return;
      document.getElementById('spinnerWrap').style.display = 'none';
      document.getElementById('formWrap').style.display    = 'block';

      if (!data.success || !data.data) {
        mostrarAlerta(data.message || 'Publicación no encontrada.', 'danger');
        return;
      }

      const p = data.data;
      document.getElementById('inputTitulo').value  = p.titulo || '';
      document.getElementById('inputTipo').value    = p.tipo_material || '';
      document.getElementById('inputCantidad').value = p.cantidad != null ? p.cantidad : '';
      document.getElementById('inputPrecio').value   = p.precio != null ? p.precio : '';
      document.getElementById('inputDesc').value     = p.descripcion || '';

      // Intentar preseleccionar la ciudad actual
      const ciudadSelect = document.getElementById('inputCiudad');
      const ciudadActual = p.ciudad || p.vendedor_ciudad || '';
      for (let i = 0; i < ciudadSelect.options.length; i++) {
        if (ciudadSelect.options[i].value === ciudadActual) {
          ciudadSelect.selectedIndex = i;
          break;
        }
      }
    })
    .catch(function() {
      document.getElementById('spinnerWrap').style.display = 'none';
      document.getElementById('formWrap').style.display    = 'block';
      mostrarAlerta('Error al cargar la publicación.', 'danger');
    });
}

function actualizar() {
  const titulo      = document.getElementById('inputTitulo').value.trim();
  const tipo        = document.getElementById('inputTipo').value;
  const ciudad      = document.getElementById('inputCiudad').value;
  const cantidad    = document.getElementById('inputCantidad').value.trim();
  const precio      = document.getElementById('inputPrecio').value.trim();
  const estado      = document.getElementById('inputEstado').value;
  const descripcion = document.getElementById('inputDesc').value.trim();
  const btn         = document.getElementById('btnActualizar');

  if (!titulo || !tipo || !cantidad || !precio) {
    mostrarAlerta('Título, tipo, cantidad y precio son requeridos.', 'warning');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Guardando...';

  fetch(API + '/products/' + id, {
    method:  'PUT',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      titulo,
      tipo_material: tipo,
      cantidad:      parseFloat(cantidad),
      precio:        parseFloat(precio),
      estado,
      ciudad,
      descripcion
    })
  })
    .then(function(res) {
      if (res.status === 401) { sessionStorage.clear(); window.location.href = 'login.html'; return null; }
      return res.json();
    })
    .then(function(data) {
      if (!data) return;
      if (data.success) {
        mostrarAlerta('Publicación actualizada. Redirigiendo...', 'success');
        setTimeout(function() { window.location.href = 'publicaciones.html'; }, 1200);
      } else {
        mostrarAlerta(data.message || 'Error al actualizar.', 'danger');
      }
    })
    .catch(function() { mostrarAlerta('Error al conectar con el servidor.', 'danger'); })
    .finally(function() {
      btn.disabled    = false;
      btn.textContent = 'Guardar cambios';
    });
}

cargarDatos();
