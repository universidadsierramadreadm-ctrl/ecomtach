/* ECOMATCH — js/inicio.js v2 */
'use strict';

const API    = 'http://localhost:3000/api';
const token  = sessionStorage.getItem('token');
const nombre = sessionStorage.getItem('nombre');

if (!token) window.location.href = 'login.html';

document.getElementById('nombreUsuario').textContent = nombre || 'Usuario';

const MODULE_INFO = {
  publicaciones: { desc: 'Materiales reciclables disponibles en SLP' },
  usuarios:      { desc: 'Administracion de usuarios (requiere admin)' },
  pagos:         { desc: 'Historial de transacciones y comisiones' },
  vip:           { desc: 'Planes premium y suscripciones' },
  chat:          { desc: 'Mensajeria entre vendedores y compradores' }
};

function cargarInicio() {
  fetch(API + '/inicio', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
    .then(function(res) {
      if (res.status === 401) { sessionStorage.clear(); window.location.href = 'login.html'; return null; }
      return res.json();
    })
    .then(function(data) {
      if (!data) return;
      document.getElementById('spinnerWrap').style.display = 'none';
      document.getElementById('contenido').style.display   = 'block';

      document.getElementById('tituloBienvenida').textContent = 'Bienvenido, ' + nombre;
      document.getElementById('fechaHora').textContent =
        new Date(data.fecha).toLocaleDateString('es-MX', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

      var modContainer = document.getElementById('tarjetasModulos');
      modContainer.innerHTML = '';
      (data.modulos || data['módulos'] || []).forEach(function(mod) {
        var info = MODULE_INFO[mod] || { desc: 'Accede a este modulo' };
        modContainer.innerHTML += '<div class="inicio-card">' +
          '<h3>' + mod + '</h3>' +
          '<p>' + info.desc + '</p>' +
          '<a href="' + mod + '.html">Ir al modulo →</a>' +
          '</div>';
      });

      var resContainer = document.getElementById('tarjetasResumen');
      resContainer.innerHTML = '';
      if (data.resumen) {
        Object.keys(data.resumen).forEach(function(key) {
          resContainer.innerHTML += '<div class="resumen-card">' +
            '<div class="resumen-num">' + Number(data.resumen[key]).toLocaleString('es-MX') + '</div>' +
            '<div class="resumen-label">' + key.replace(/_/g, ' ') + '</div>' +
            '</div>';
        });
      }
    })
    .catch(function() {
      document.getElementById('spinnerWrap').style.display = 'none';
      var el = document.getElementById('alerta');
      el.textContent = 'Error al cargar el panel. Verifica que el servidor este corriendo.';
      el.className = 'alerta danger';
    });
}

function cerrarSesion() {
  if (!confirm('Seguro que deseas cerrar sesion?')) return;
  sessionStorage.clear();
  window.location.href = 'login.html';
}

cargarInicio();
