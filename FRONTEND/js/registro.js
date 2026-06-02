/* ECOMATCH — js/registro.js v2 */
'use strict';

const API = 'http://localhost:3000/api/auth';

// Redirigir si ya hay sesión activa
if (sessionStorage.getItem('token')) {
  window.location.href = 'inicio.html';
}

function mostrarAlerta(msg, tipo) {
  const el = document.getElementById('alerta');
  el.textContent = msg;
  el.className = 'alerta ' + tipo;
}

function ocultarAlerta() {
  document.getElementById('alerta').className = 'alerta';
}

function togglePass(inputId, btn) {
  const input = document.getElementById(inputId);
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.style.color = isText ? '' : 'var(--eco-green)';
}

function registro() {
  const nombre   = document.getElementById('inputNombre').value.trim();
  const empresa  = document.getElementById('inputEmpresa').value.trim();
  const email    = document.getElementById('inputEmail').value.trim();
  const password = document.getElementById('inputPassword').value.trim();
  const tipo     = document.getElementById('inputTipo').value;
  const ciudad   = document.getElementById('inputCiudad').value;
  const estado   = document.getElementById('inputEstado').value;
  const btn      = document.getElementById('btnRegistro');

  ocultarAlerta();

  if (!nombre || !email || !password || !tipo) {
    mostrarAlerta('Nombre, correo, contraseña y tipo de usuario son requeridos.', 'warning');
    return;
  }

  if (password.length < 8) {
    mostrarAlerta('La contraseña debe tener al menos 8 caracteres.', 'warning');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Registrando...';

  fetch(`${API}/registro`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      nombre,
      email,
      password,
      tipo_usuario: tipo,
      empresa: empresa || nombre,
      estado,
      ciudad
    })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        mostrarAlerta(data.message || 'Error al registrar. Verifica que el correo no esté en uso.', 'danger');
        return;
      }
      mostrarAlerta('¡Cuenta creada correctamente! Redirigiendo al inicio de sesión...', 'success');
      setTimeout(() => { window.location.href = 'login.html'; }, 1800);
    })
    .catch(() => mostrarAlerta('No se pudo conectar al servidor. Verifica que el backend esté corriendo.', 'danger'))
    .finally(() => {
      btn.disabled    = false;
      btn.textContent = 'Crear cuenta gratis';
    });
}
