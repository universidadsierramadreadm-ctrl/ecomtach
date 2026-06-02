/* ECOMATCH — js/login.js v2 */
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

function login() {
  const email    = document.getElementById('inputEmail').value.trim();
  const password = document.getElementById('inputPassword').value.trim();
  const btn      = document.getElementById('btnLogin');

  ocultarAlerta();

  if (!email || !password) {
    mostrarAlerta('Correo y contraseña son requeridos.', 'warning');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Ingresando...';

  fetch(`${API}/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.token) {
        mostrarAlerta(data.message || 'Credenciales incorrectas. Verifica tu correo y contraseña.', 'danger');
        return;
      }
      sessionStorage.setItem('token',  data.token);
      sessionStorage.setItem('nombre', data.nombre || (data.user && data.user.nombre) || 'Usuario');
      window.location.href = 'inicio.html';
    })
    .catch(() => mostrarAlerta('No se pudo conectar al servidor. Verifica que el backend esté corriendo.', 'danger'))
    .finally(() => {
      btn.disabled    = false;
      btn.textContent = 'Ingresar';
    });
}
