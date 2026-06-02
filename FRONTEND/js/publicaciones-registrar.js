/* ECOMATCH — js/publicaciones-registrar.js v2 */
'use strict';

const API    = 'http://localhost:3000/api';
const token  = sessionStorage.getItem('token');
const nombre = sessionStorage.getItem('nombre');

if (!token) window.location.href = 'login.html';

document.getElementById('nombreNav').textContent = nombre || '';

function mostrarAlerta(msg, tipo) {
  const el = document.getElementById('alerta');
  el.textContent = msg;
  el.className = 'alerta ' + tipo;
}

function cerrarSesion() {
  sessionStorage.clear();
  window.location.href = 'login.html';
}

function registrar() {
  const titulo      = document.getElementById('inputTitulo').value.trim();
  const tipo        = document.getElementById('inputTipo').value;
  const ciudad      = document.getElementById('inputCiudad').value;
  const cantidad    = document.getElementById('inputCantidad').value.trim();
  const precio      = document.getElementById('inputPrecio').value.trim();
  const estado      = document.getElementById('inputEstado').value;
  const descripcion = document.getElementById('inputDesc').value.trim();
  const btn         = document.getElementById('btnGuardar');

  if (!titulo || !tipo || !ciudad || !cantidad || !precio) {
    mostrarAlerta('Título, tipo, ciudad, cantidad y precio son requeridos.', 'warning');
    return;
  }

  if (parseFloat(cantidad) <= 0 || parseFloat(precio) <= 0) {
    mostrarAlerta('La cantidad y el precio deben ser valores positivos.', 'warning');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Guardando...';

  fetch(API + '/products', {
    method:  'POST',
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
        mostrarAlerta('Publicación creada correctamente. Redirigiendo...', 'success');
        setTimeout(function() { window.location.href = 'publicaciones.html'; }, 1200);
      } else {
        mostrarAlerta(data.message || 'Error al guardar.', 'danger');
      }
    })
    .catch(function() { mostrarAlerta('Error al conectar con el servidor.', 'danger'); })
    .finally(function() {
      btn.disabled    = false;
      btn.textContent = 'Guardar publicación';
    });
}
