// === BASE DE DATOS === //
let db;

const request = indexedDB.open("bancoDB", 1);
request.onupgradeneeded = function (event) {
  db = event.target.result;

  if (!db.objectStoreNames.contains("usuarios")) {
    db.createObjectStore("usuarios", { keyPath: "numeroCuenta" });
  }

  if (!db.objectStoreNames.contains("movimientos")) {
    db.createObjectStore("movimientos", { autoIncrement: true });
  }
};

request.onsuccess = function (event) {
  db = event.target.result;
  iniciarApp();
};

// === FUNCIONES === //

function guardarMovimiento(movimiento) {
  const transaccion = db.transaction("movimientos", "readwrite");
  const store = transaccion.objectStore("movimientos");
  store.add(movimiento);
}

function obtenerFechaHoy() {
  const hoy = new Date();
  return hoy.toLocaleDateString("es-CO");
}

function generarNumeroCuenta() {
  return Math.floor(100000000 + Math.random() * 900000000).toString();
}

function crearCuenta(documento, nombre, clave) {
  const numeroCuenta = generarNumeroCuenta();
  const usuario = {
    numeroCuenta,
    documento,
    nombre,
    clave,
    saldo: 0
  };

  const transaccion = db.transaction("usuarios", "readwrite");
  const store = transaccion.objectStore("usuarios");
  const request = store.add(usuario);

  request.onsuccess = () => {
    alert(`Cuenta creada con éxito. Su número de cuenta es ${numeroCuenta}`);
    window.location.href = "/html/index.html";
  };

  request.onerror = () => {
    alert("Error al crear la cuenta. Verifique los datos.");
  };
}

function consignar(numeroCuenta, valor) {
  const transaccion = db.transaction("usuarios", "readwrite");
  const store = transaccion.objectStore("usuarios");
  const request = store.get(numeroCuenta);

  request.onsuccess = function () {
    const usuario = request.result;
    if (!usuario) return alert("Cuenta no encontrada");
    if (valor <= 0) return alert("Valor inválido");

    usuario.saldo += valor;
    store.put(usuario);

    guardarMovimiento({
      tipo: "consignación",
      valor,
      fecha: obtenerFechaHoy(),
      numeroCuenta
    });

    alert("Consignación exitosa");
  };
}

function retirar(numeroCuenta, clave, valor) {
  const transaccion = db.transaction("usuarios", "readwrite");
  const store = transaccion.objectStore("usuarios");
  const request = store.get(numeroCuenta);

  request.onsuccess = function () {
    const usuario = request.result;
    if (!usuario) return alert("Cuenta no encontrada");
    if (usuario.clave !== clave) return alert("Clave incorrecta");
    if (valor > usuario.saldo) return alert("Saldo insuficiente");

    usuario.saldo -= valor;
    store.put(usuario);

    guardarMovimiento({
      tipo: "retiro",
      valor,
      fecha: obtenerFechaHoy(),
      numeroCuenta
    });

    alert("Retiro exitoso");
  };
}

function pagarServicio(numeroCuenta, clave, tipoServicio, valor, referencia) {
  const transaccion = db.transaction("usuarios", "readwrite");
  const store = transaccion.objectStore("usuarios");
  const request = store.get(numeroCuenta);

  request.onsuccess = function () {
    const usuario = request.result;
    if (!usuario) return alert("Cuenta no encontrada");
    if (usuario.clave !== clave) return alert("Clave incorrecta");
    if (valor > usuario.saldo) return alert("Saldo insuficiente");

    usuario.saldo -= valor;
    store.put(usuario);

    guardarMovimiento({
      tipo: `pago ${tipoServicio}`,
      valor,
      fecha: obtenerFechaHoy(),
      numeroCuenta,
      referencia
    });

    alert("Pago realizado con éxito");
  };
}

function mostrarTransacciones() {
  const contenedor = document.getElementById("lista-movimientos");
  if (!contenedor) return;
  contenedor.innerHTML = "";

  const transaccion = db.transaction("movimientos", "readonly");
  const store = transaccion.objectStore("movimientos");

  const movimientos = [];
  store.openCursor().onsuccess = function (e) {
    const cursor = e.target.result;
    if (cursor) {
      movimientos.push(cursor.value);
      cursor.continue();
    } else {
      movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      movimientos.forEach((mov) => {
        const fila = document.createElement("div");
        fila.classList.add("movimiento");

        const tipo = mov.tipo || "-";
        const valor = `$${Number(mov.valor).toLocaleString("es-CO")}`;
        const fecha = mov.fecha || "-";
        const cuenta = mov.numeroCuenta || "-";

        fila.innerHTML = `
          <span>${tipo}</span>
          <span>${valor}</span>
          <span>${fecha}</span>
          <span>${cuenta}</span>
        `;

        contenedor.appendChild(fila);
      });
    }
  };
}

function iniciarSesion(e) {
  e.preventDefault();

  const numeroCuenta = document.getElementById("cuenta-login").value.trim();
  const clave = document.getElementById("clave-login").value.trim();

  const transaccion = db.transaction("usuarios", "readonly");
  const store = transaccion.objectStore("usuarios");
  const request = store.get(numeroCuenta);

  request.onsuccess = function () {
    const usuario = request.result;
    if (!usuario) return alert("Cuenta no encontrada");
    if (usuario.clave !== clave) return alert("Clave incorrecta");

    localStorage.setItem("usuarioActivo", JSON.stringify(usuario));
    window.location.href = "html/dashboard.html";
  };
}

function iniciarApp() {
  const pathname = window.location.pathname;

  // Index (login)
  if (pathname.includes("index.html") || pathname.endsWith("/")) {
    const btnIngresar = document.getElementById("btn-ingresar");
    if (btnIngresar) {
      btnIngresar.addEventListener("click", iniciarSesion);
    }

    const btnCrear = document.getElementById("btn-ir-crear-cuenta");
    if (btnCrear) {
      btnCrear.addEventListener("click", () => {
        window.location.href = "html/crear_cuenta.html";
      });
    }
  }

  // Crear cuenta
  if (pathname.includes("crear_cuenta.html")) {
    const btn = document.getElementById("btn-crear");
    if (btn) {
      btn.addEventListener("click", () => {
        const documento = document.getElementById("documento").value;
        const nombre = document.getElementById("nombre").value;
        const clave = document.getElementById("clave").value;
        crearCuenta(documento, nombre, clave);
      });
    }
  }

  // Dashboard
  if (pathname.includes("dashboard.html")) {
    const datosUsuario = JSON.parse(localStorage.getItem("usuarioActivo"));
    if (datosUsuario) {
      document.getElementById("numero-cuenta-span").textContent = datosUsuario.numeroCuenta;
      document.getElementById("usuario-span").textContent = datosUsuario.nombre;
      document.getElementById("saldo-span").textContent = `$${Number(datosUsuario.saldo).toLocaleString("es-CO")}`;
    }

    document.getElementById("btn-servicios").onclick = () => window.location.href = "servicios.html";
    document.getElementById("btn-transacciones").onclick = () => window.location.href = "transacciones.html";
    document.getElementById("btn-consignar").onclick = () => window.location.href = "consignar.html";
  }

  // Servicios
  if (pathname.includes("servicios.html")) {
    document.querySelectorAll(".tarjeta-servicio").forEach(btn => {
      btn.addEventListener("click", () => {
        const tipo = btn.getAttribute("data-servicio");
        const referencia = prompt("Ingrese la referencia del servicio");
        const valor = parseFloat(prompt("Ingrese el valor a pagar"));
        const cuenta = prompt("Ingrese su número de cuenta");
        const clave = prompt("Ingrese su clave");

        if (tipo && referencia && valor && cuenta && clave) {
          pagarServicio(cuenta, clave, tipo, valor, referencia);
        }
      });
    });
  }

  // Transacciones
  if (pathname.includes("transacciones.html")) {
    mostrarTransacciones();
  }

  // Consignar/Retirar
  if (pathname.includes("consignar.html")) {
    document.getElementById("btn-consignar").onclick = () => {
      const cuenta = document.getElementById("numero-cuenta").value;
      const valor = parseFloat(document.getElementById("valor").value);
      consignar(cuenta, valor);
    };

    document.getElementById("btn-retirar").onclick = () => {
      const cuenta = document.getElementById("numero-cuenta").value;
      const clave = document.getElementById("clave").value;
      const valor = parseFloat(document.getElementById("valor").value);
      retirar(cuenta, clave, valor);
    };
  }
}
