/* ECOMATCH — js/usuarios.js v2 */
'use strict';

const API    = 'http://localhost:3000/api';
const token  = sessionStorage.getItem('token');
const nombre = sessionStorage.getItem('nombre');

if (!token) window.location.href = 'login.html';

document.getElementById('nombreNav').textContent = nombre || '';

let todosLosRegistros = [];

function mostrarAlerta(msg, tipo) {
  const el = document.getElementById('alerta');
  el.textContent = msg;
  el.className = 'alerta ' + tipo;
  setTimeout(function() { el.className = 'alerta'; }, 6000);
}

function cerrarSesion() {
  sessionStorage.clear();
  window.location.href = 'login.html';
}

function badgeRol(tipo) {
  var clases = { admin: 'badge-admin', centro: 'badge-centro', vip: 'badge-vip' };
  var cls = clases[tipo] || 'badge-tipo';
  return '<span class="' + cls + '">' + (tipo || '—') + '</span>';
}

function cargarUsuarios() {
  fetch(API + '/users', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
    .then(function(res) {
      if (res.status === 401) { sessionStorage.clear(); window.location.href = 'login.html'; return null; }
      return res.json();
    })
    .then(function(data) {
      if (!data) return;
      document.getElementById('spinnerWrap').style.display = 'none';
      document.getElementById('tablaWrap').style.display   = 'block';

      if (!data.success) {
        mostrarAlerta(data.message || 'Acceso denegado. Se requiere rol admin para ver usuarios.', 'danger');
        todosLosRegistros = [];
        renderTabla([]);
        return;
      }

      todosLosRegistros = data.data || [];
      renderTabla(todosLosRegistros);
    })
    .catch(function() {
      document.getElementById('spinnerWrap').style.display = 'none';
      document.getElementById('tablaWrap').style.display   = 'block';
      mostrarAlerta('Error al cargar usuarios.', 'danger');
    });
}

function renderTabla(lista) {
  var tbody  = document.getElementById('tablaBody');
  var sinRes = document.getElementById('sinResultados');

  if (!lista.length) {
    tbody.innerHTML = '';
    sinRes.style.display = 'block';
    return;
  }
  sinRes.style.display = 'none';

  tbody.innerHTML = lista.map(function(u, i) {
    var estadoBadge = u.activo
      ? '<span class="badge-activo">● Activo</span>'
      : '<span class="badge-inactivo">● Inactivo</span>';
    var vipBadge = u.es_vip
      ? '<span class="badge-vip">VIP</span>'
      : '<span style="color:var(--eco-muted);font-size:12px;">—</span>';

    return '<tr>' +
      '<td style="color:var(--eco-muted);font-size:12px;">' + (i + 1) + '</td>' +
      '<td style="font-weight:500;">' + (u.nombre || '—') + '</td>' +
      '<td style="color:var(--eco-muted);font-size:13px;">' + (u.email || '—') + '</td>' +
      '<td>' + badgeRol(u.tipo_usuario) + '</td>' +
      '<td>' + vipBadge + '</td>' +
      '<td>' + estadoBadge + '</td>' +
      '<td>' +
        '<a href="usuarios-editar.html?id=' + u.id + '" class="btn-edit">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
          'Editar' +
        '</a>' +
        '<button class="btn-delete" onclick="eliminar(' + u.id + ')">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>' +
          'Eliminar' +
        '</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function buscar() {
  var q = document.getElementById('buscador').value.toLowerCase().trim();
  if (!q) { renderTabla(todosLosRegistros); return; }
  renderTabla(todosLosRegistros.filter(function(u) {
    return (u.nombre || '').toLowerCase().includes(q) ||
           (u.email  || '').toLowerCase().includes(q);
  }));
}

function eliminar(id) {
  if (!confirm('¿Seguro que deseas eliminar este usuario? Esta acción no se puede deshacer.')) return;

  fetch(API + '/users/admin/' + id, {
    method:  'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  })
    .then(function(res) {
      if (res.status === 401) { sessionStorage.clear(); window.location.href = 'login.html'; return null; }
      return res.json();
    })
    .then(function(data) {
      if (!data) return;
      if (data.success) {
        mostrarAlerta('Usuario eliminado correctamente.', 'success');
        cargarUsuarios();
      } else {
        mostrarAlerta(data.message || 'Error al eliminar.', 'danger');
      }
    })
    .catch(function() { mostrarAlerta('Error al eliminar.', 'danger'); });
}

cargarUsuarios();
