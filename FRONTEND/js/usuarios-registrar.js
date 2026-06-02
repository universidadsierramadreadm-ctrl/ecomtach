/* ECOMATCH — js/usuarios-registrar.js v2 */
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

function togglePass(inputId, btn) {
  const input = document.getElementById(inputId);
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.style.color = isText ? '' : 'var(--eco-green)';
}

function registrar() {
  const nombreVal = document.getElementById('inputNombre').value.trim();
  const empresa   = document.getElementById('inputEmpresa').value.trim();
  const email     = document.getElementById('inputEmail').value.trim();
  const password  = document.getElementById('inputPassword').value.trim();
  const tipo      = document.getElementById('inputTipo').value;
  const ciudad    = document.getElementById('inputCiudad').value;
  const btn       = document.getElementById('btnGuardar');

  if (!nombreVal || !email || !password || !tipo) {
    mostrarAlerta('Nombre, correo, contraseña y tipo son requeridos.', 'warning');
    return;
  }

  if (password.length < 8) {
    mostrarAlerta('La contraseña debe tener al menos 8 caracteres.', 'warning');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Creando usuario...';

  fetch(API + '/users/admin/create', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      nombre:       nombreVal,
      email,
      password,
      tipo_usuario: tipo,
      empresa:      empresa || nombreVal,
      estado:       'San Luis Potosí',
      ciudad
    })
  })
    .then(function(res) {
      if (res.status === 401) { sessionStorage.clear(); window.location.href = 'login.html'; return null; }
      return res.json();
    })
    .then(function(data) {
      if (!data) return;
      if (data.success) {
        mostrarAlerta('Usuario creado correctamente. Redirigiendo...', 'success');
        setTimeout(function() { window.location.href = 'usuarios.html'; }, 1200);
      } else {
        mostrarAlerta(data.message || 'Error al crear usuario.', 'danger');
      }
    })
    .catch(function() { mostrarAlerta('Error al conectar con el servidor.', 'danger'); })
    .finally(function() {
      btn.disabled    = false;
      btn.textContent = 'Crear usuario';
    });
}
