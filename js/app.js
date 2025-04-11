// IndexedDB config
let db;

const request = indexedDB.open('bancoDB', 1);

request.onupgradeneeded = function (event) {
  db = event.target.result;
  const store = db.createObjectStore('movimientos', {
    keyPath: 'id',
    autoIncrement: true,
  });
  store.createIndex('tipo', 'tipo', { unique: false });
};

request.onsuccess = function (event) {
  db = event.target.result;
  initApp();
};

request.onerror = function (event) {
  console.error('Error al abrir IndexedDB', event);
};

// Iniciar funciones según la vista
function initApp() {
  const path = window.location.pathname;

  if (path.includes('index.html')) {
    initLogin();
  } else if (path.includes('html/dashboard.html')) {
    cargarMovimientos();
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      window.location.href = '../index.html';
    });
    document.getElementById('agregar-btn')?.addEventListener('click', () => {
      window.location.href = 'movimiento.html';
    });
    document.getElementById('exportar-btn')?.addEventListener('click', exportarJSON);
  } else if (path.includes('html/movimiento.html')) {
    initFormularioMovimiento();
  }
}

// ----------------------------
// INICIO DE SESIÓN
// ----------------------------
function initLogin() {
  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const usuario = document.getElementById('usuario').value;
      const password = document.getElementById('password').value;

      if (!usuario || !password) {
        alert('Por favor completa todos los campos.');
        return;
      }

      // Validación simulada
      if (usuario === 'admin' && password === '1234') {
        window.location.href = 'html/dashboard.html';
      } else {
        alert('Usuario o contraseña incorrectos');
      }
    });
  }
}

// ----------------------------
// FORMULARIO NUEVO MOVIMIENTO
// ----------------------------
function initFormularioMovimiento() {
  const form = document.getElementById('form-movimiento');
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const tipo = document.getElementById('tipo').value;
    const monto = parseFloat(document.getElementById('monto').value);
    const descripcion = document.getElementById('descripcion').value;

    if (!tipo || !monto || !descripcion) {
      alert('Completa todos los campos');
      return;
    }

    const nuevoMovimiento = {
      tipo,
      monto,
      descripcion,
      fecha: new Date().toISOString(),
    };

    const tx = db.transaction(['movimientos'], 'readwrite');
    const store = tx.objectStore('movimientos');
    store.add(nuevoMovimiento);

    tx.oncomplete = () => {
      window.location.href = 'dashboard.html';
    };

    tx.onerror = () => {
      alert('Error al guardar el movimiento.');
    };
  });
}

// ----------------------------
// CARGAR MOVIMIENTOS Y SALDO
// ----------------------------
function cargarMovimientos() {
  const lista = document.getElementById('lista-movimientos');
  const saldoSpan = document.getElementById('saldo');

  const tx = db.transaction(['movimientos'], 'readonly');
  const store = tx.objectStore('movimientos');
  const request = store.getAll();

  request.onsuccess = () => {
    const movimientos = request.result;
    let saldo = 0;

    if (lista) lista.innerHTML = '';

    movimientos.forEach((mov) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${mov.tipo === 'ingreso' ? '+' : '-'}</strong> $${mov.monto.toFixed(2)} – 
        ${mov.descripcion} <small>(${new Date(mov.fecha).toLocaleDateString()})</small>
      `;
      if (lista) lista.appendChild(li);
      saldo += mov.tipo === 'ingreso' ? mov.monto : -mov.monto;
    });

    if (saldoSpan) saldoSpan.textContent = `$${saldo.toFixed(2)}`;
  };
}

// ----------------------------
// EXPORTAR A JSON
// ----------------------------
function exportarJSON() {
  const tx = db.transaction(['movimientos'], 'readonly');
  const store = tx.objectStore('movimientos');
  const request = store.getAll();

  request.onsuccess = () => {
    const data = request.result;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'movimientos.json';
    a.click();
    URL.revokeObjectURL(url);
  };
}