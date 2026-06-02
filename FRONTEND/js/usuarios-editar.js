/* ECOMATCH — js/usuarios-editar.js v2 */
'use strict';

const API    = 'http://localhost:3000/api';
const token  = sessionStorage.getItem('token');
const nombre = sessionStorage.getItem('nombre');

if (!token) window.location.href = 'login.html';

document.getElementById('nombreNav').textContent = nombre || '';

const params = new URLSearchParams(window.location.search);
const id     = params.get('id');
if (!id) window.location.href = 'usuarios.html';

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
  fetch(API + '/users/profile/' + id, {
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
        mostrarAlerta(data.message || 'Usuario no encontrado.', 'danger');
        return;
      }

      var u = data.data;
      document.getElementById('inputNombre').value  = u.nombre  || '';
      document.getElementById('inputEmail').value   = u.email   || '';
      document.getElementById('inputEmpresa').value = u.empresa || '';
      document.getElementById('inputTipo').value    = u.tipo_usuario || '';
      document.getElementById('inputActivo').value  = u.activo ? '1' : '0';
    })
    .catch(function() {
      document.getElementById('spinnerWrap').style.display = 'none';
      document.getElementById('formWrap').style.display    = 'block';
      mostrarAlerta('Error al cargar el usuario.', 'danger');
    });
}

function actualizar() {
  var nombreVal = document.getElementById('inputNombre').value.trim();
  var email     = document.getElementById('inputEmail').value.trim();
  var empresa   = document.getElementById('inputEmpresa').value.trim();
  var tipo      = document.getElementById('inputTipo').value;
  var activo    = document.getElementById('inputActivo').value;
  var btn       = document.getElementById('btnActualizar');

  if (!nombreVal || !email || !tipo) {
    mostrarAlerta('Nombre, correo y tipo son requeridos.', 'warning');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Guardando...';

  fetch(API + '/users/admin/' + id, {
    method:  'PUT',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      nombre:       nombreVal,
      email,
      empresa,
      tipo_usuario: tipo,
      activo:       parseInt(activo)
    })
  })
    .then(function(res) {
      if (res.status === 401) { sessionStorage.clear(); window.location.href = 'login.html'; return null; }
      return res.json();
    })
    .then(function(data) {
      if (!data) return;
      if (data.success) {
        mostrarAlerta('Usuario actualizado correctamente. Redirigiendo...', 'success');
        setTimeout(function() { window.location.href = 'usuarios.html'; }, 1200);
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
