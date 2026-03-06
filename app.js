/* ===========================================================
   ESTADO GLOBAL
   =========================================================== */
let currency = 'EUR';
let chartBar = null;
let chartLine = null;

const CURRENCIES = {
  EUR: { symbol: '\u20ac', locale: 'de-DE' },
  USD: { symbol: '$', locale: 'en-US' }
};

/* ===========================================================
   FORMATO DE MONEDA
   =========================================================== */
function fmt(n) {
  const c = CURRENCIES[currency];
  if (Math.abs(n) >= 1e6) return c.symbol + (n / 1e6).toFixed(2) + 'M';
  return c.symbol + Math.round(n).toLocaleString(c.locale);
}
function fmtFull(n) {
  const c = CURRENCIES[currency];
  return c.symbol + n.toLocaleString(c.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtAxis(v) {
  const c = CURRENCIES[currency];
  if (v >= 1e6) return c.symbol + (v / 1e6).toFixed(1) + 'M';
  if (v >= 1000) return c.symbol + (v / 1000).toFixed(0) + 'k';
  return c.symbol + v;
}

/* ===========================================================
   SELECTOR DE MONEDA
   =========================================================== */
function setCurrency(cur) {
  currency = cur;
  document.getElementById('btn-eur').classList.toggle('active', cur === 'EUR');
  document.getElementById('btn-usd').classList.toggle('active', cur === 'USD');
  const sym = CURRENCIES[cur].symbol;
  document.getElementById('pfx-cap').textContent = sym;
  document.getElementById('pfx-apt').textContent = sym;
  document.getElementById('pfx-ret').textContent = sym;
  calcular();
}

/* ===========================================================
   SLIDER TASA
   =========================================================== */
function syncTasa(v) {
  const val = parseFloat(v).toFixed(1);
  document.getElementById('tasa').value = val;
  document.getElementById('tasa-lbl').textContent = val + '%';
  updateSliderFill();
}
function syncSlider(v) {
  const val = Math.min(25, Math.max(0.1, parseFloat(v) || 0));
  document.getElementById('tasa-slider').value = val;
  document.getElementById('tasa-lbl').textContent = val.toFixed(1) + '%';
  updateSliderFill();
}
function updateSliderFill() {
  const slider = document.getElementById('tasa-slider');
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.background = 'linear-gradient(90deg, var(--teal-400) ' + pct + '%, var(--border) ' + pct + '%)';
}

/* ===========================================================
   CALCULO PRINCIPAL
   =========================================================== */
function calcular() {
  const C = parseFloat(document.getElementById('capital').value) || 0;
  const A_base = parseFloat(document.getElementById('aporte').value) || 0;
  const freq_A = parseInt(document.getElementById('frecuencia_aporte').value) || 12;
  const inc_A = parseFloat(document.getElementById('incremento_aporte').value) / 100 || 0;
  const r = parseFloat(document.getElementById('tasa').value) / 100 || 0;
  const t = Math.max(1, parseInt(document.getElementById('anios').value) || 1);
  const n = parseInt(document.getElementById('capitalizacion').value) || 12;
  const inf = parseFloat(document.getElementById('inflacion').value) / 100 || 0;
  const imp = parseFloat(document.getElementById('impuestos').value) / 100 || 0;
  const com = parseFloat(document.getElementById('comisiones').value) / 100 || 0;
  const ret = parseFloat(document.getElementById('retiro').value) || 0;

  var labels = [], arrInv = [], arrInt = [], arrTotal = [], arrReal = [], arrIntAno = [];

  const r_c = Math.pow(1 + r / n, n / freq_A) - 1;

  let currentTotal = C;
  let currentAporteNet = A_base;
  let totalInvested = C;

  labels.push('Inicio');
  arrInv.push(C);
  arrInt.push(0);
  arrTotal.push(C);
  arrReal.push(C);
  arrIntAno.push(0);

  let prevTotal = C;

  for (let y = 1; y <= t; y++) {
    let yearEndTotal = currentTotal * Math.pow(1 + r / n, n);

    let yearContributionsFV = 0;
    if (currentAporteNet > 0) {
      if (r_c === 0) {
        yearContributionsFV = currentAporteNet * freq_A;
      } else {
        yearContributionsFV = currentAporteNet * ((Math.pow(1 + r_c, freq_A) - 1) / r_c) * Math.pow(1 + r / n, n / freq_A);
      }
    }

    if (r_c > 0 && currentAporteNet > 0) {
      yearContributionsFV = currentAporteNet * ((Math.pow(1 + r_c, freq_A) - 1) / r_c);
    }

    yearEndTotal += yearContributionsFV;

    // Restar retiros mensuales (estimado simplificado al final de cada mes => resta total del año)
    const annualRetiro = ret * 12;
    yearEndTotal = Math.max(0, yearEndTotal - annualRetiro);

    // Aplicar comisiones anuales
    yearEndTotal = yearEndTotal * (1 - com);

    let yearInvested = currentAporteNet * freq_A;
    totalInvested += yearInvested;

    currentTotal = yearEndTotal;

    let interesAcum = Math.max(0, currentTotal - totalInvested);
    let valorReal = currentTotal / Math.pow(1 + inf, y);
    let interesDelAno = currentTotal - prevTotal - yearInvested + annualRetiro; // Re-ajustamos interés para flujo neto

    labels.push('Año ' + y);
    arrInv.push(parseFloat(totalInvested.toFixed(2)));
    arrInt.push(parseFloat(interesAcum.toFixed(2)));
    arrTotal.push(parseFloat(currentTotal.toFixed(2)));
    arrReal.push(parseFloat(valorReal.toFixed(2)));
    arrIntAno.push(parseFloat(Math.max(0, interesDelAno).toFixed(2)));

    prevTotal = currentTotal;
    currentAporteNet = currentAporteNet * (1 + inc_A);
  }

  var montoFinal = arrTotal[t];
  var totalInvertido = arrInv[t];
  var interesGanado = arrInt[t];

  var impuestosCost = interesGanado * imp;
  var netoDespuesImpuestos = montoFinal - impuestosCost;

  var valorRealFinal = arrReal[t];
  var pct = totalInvertido > 0 ? ((interesGanado / totalInvertido) * 100).toFixed(1) : '0.0';
  var cagr = totalInvertido > 0 ? (Math.pow(montoFinal / totalInvertido, 1 / t) - 1) * 100 : 0;
  var mult = totalInvertido > 0 ? montoFinal / totalInvertido : 1;
  var ultimoAnio = arrIntAno[t];

  animateNum('res-final', montoFinal, fmt);
  animateNum('res-invertido', totalInvertido, fmt);
  animateNum('res-interes', interesGanado, fmt);

  document.getElementById('res-pct').textContent = '+' + pct + '% rendimiento total';
  document.getElementById('res-cagr').textContent = cagr.toFixed(2) + '% anual';
  document.getElementById('res-real').textContent = fmt(valorRealFinal);

  const resImpuestosEl = document.getElementById('res-impuestos');
  if (resImpuestosEl) {
    resImpuestosEl.textContent = fmt(netoDespuesImpuestos);
  }

  document.getElementById('res-mult').textContent = 'x' + mult.toFixed(2);
  document.getElementById('res-ultimo').textContent = fmt(ultimoAnio);

  dibujarBar(labels, arrInv, arrInt);
  dibujarLine(labels, arrTotal, arrReal);
  generarTabla(labels, arrInv, arrInt, arrTotal, arrReal, arrIntAno);
}

/* ===========================================================
   ANIMACION NUMEROS
   =========================================================== */
function animateNum(id, target, fn) {
  var el = document.getElementById(id);
  var dur = 750;
  var t0 = performance.now();
  function tick(t) {
    var p = Math.min((t - t0) / dur, 1);
    var e = 1 - Math.pow(1 - p, 3);
    el.textContent = fn(target * e);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = fn(target);
  }
  requestAnimationFrame(tick);
}

/* ===========================================================
   GRAFICO BARRAS
   =========================================================== */
function dibujarBar(labels, inv, interes) {
  var ctx = document.getElementById('chartBar').getContext('2d');
  if (chartBar) chartBar.destroy();

  var step = labels.length > 40 ? 5 : labels.length > 20 ? 2 : 1;
  var L = labels.filter(function (_, i) { return i % step === 0; });
  var I = inv.filter(function (_, i) { return i % step === 0; });
  var G = interes.filter(function (_, i) { return i % step === 0; });

  chartBar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: L,
      datasets: [
        {
          label: 'Capital Aportado',
          data: I,
          backgroundColor: 'rgba(22,58,116,.78)',
          borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 },
          stack: 'a'
        },
        {
          label: 'Intereses Ganados',
          data: G,
          backgroundColor: 'rgba(28,184,122,.88)',
          borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
          stack: 'a'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: 'index' },
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: function (c) { return ' ' + c.dataset.label + ': ' + fmtFull(parseFloat(c.raw)); }
          }
        }
      },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: {
          stacked: true,
          grid: { color: 'rgba(0,0,0,.05)' },
          ticks: { callback: fmtAxis }
        }
      }
    }
  });
}

/* ===========================================================
   GRAFICO LINEAS
   =========================================================== */
function dibujarLine(labels, total, real) {
  var ctx = document.getElementById('chartLine').getContext('2d');
  if (chartLine) chartLine.destroy();

  chartLine = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Valor Nominal',
          data: total,
          borderColor: 'rgba(28,184,122,1)',
          backgroundColor: 'rgba(28,184,122,.07)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2.5
        },
        {
          label: 'Valor Real (ajust. inflación)',
          data: real,
          borderColor: 'rgba(212,168,67,1)',
          backgroundColor: 'rgba(212,168,67,.06)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
          borderDash: [6, 3]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: 'index' },
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: function (c) { return ' ' + c.dataset.label + ': ' + fmtFull(parseFloat(c.raw)); }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
        y: {
          grid: { color: 'rgba(0,0,0,.05)' },
          ticks: { callback: fmtAxis }
        }
      }
    }
  });
}

/* ===========================================================
   TABLA DE DESGLOSE
   =========================================================== */
function generarTabla(labels, inv, intAcum, total, real, intAno) {
  var tbody = document.getElementById('breakdownBody');
  tbody.innerHTML = '';
  for (var i = 0; i < labels.length; i++) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + labels[i] + '</td>' +
      '<td>' + fmtFull(inv[i]) + '</td>' +
      '<td>' + fmtFull(intAcum[i]) + '</td>' +
      '<td><strong>' + fmtFull(total[i]) + '</strong></td>' +
      '<td class="gc">' + (i === 0 ? '&mdash;' : '+' + fmtFull(intAno[i])) + '</td>' +
      '<td>' + fmtFull(real[i]) + '</td>';
    tbody.appendChild(tr);
  }
}

/* ===========================================================
   TABS
   =========================================================== */
function switchTab(viewId, btn) {
  document.querySelectorAll('.chart-view').forEach(function (v) { v.classList.remove('active'); });
  document.querySelectorAll('.chart-tab').forEach(function (b) { b.classList.remove('active'); });
  document.getElementById(viewId).classList.add('active');
  btn.classList.add('active');
}

/* ===========================================================
   FAQ
   =========================================================== */
function toggleFaq(btn) {
  var answer = btn.nextElementSibling;
  var isOpen = answer.classList.contains('open');
  document.querySelectorAll('.faq-a').forEach(function (a) { a.classList.remove('open'); });
  document.querySelectorAll('.faq-q').forEach(function (q) { q.classList.remove('open'); });
  if (!isOpen) { answer.classList.add('open'); btn.classList.add('open'); }
}

/* ===========================================================
   PAGINAS LEGALES
   =========================================================== */
function showLegal(page) {
  document.getElementById('mainContent').style.display = 'none';
  document.querySelectorAll('.legal-page').forEach(function (p) { p.classList.remove('active'); });
  var el = document.getElementById('page-' + page);
  if (el) { el.classList.add('active'); window.scrollTo(0, 0); }
  if (!document.getElementById('btn-volver')) {
    var div = document.createElement('div');
    div.id = 'btn-volver';
    div.style.cssText = 'text-align:center;padding:24px;background:var(--surface)';
    div.innerHTML = '<button onclick="showMain()" style="background:var(--teal-400);color:white;border:none;padding:12px 32px;border-radius:50px;font-size:.95rem;font-weight:700;cursor:pointer;font-family:var(--font-body)">Volver a la calculadora</button>';
    document.querySelector('footer').before(div);
  }
  document.getElementById('btn-volver').style.display = 'block';
}
function showMain() {
  document.getElementById('mainContent').style.display = 'block';
  document.querySelectorAll('.legal-page').forEach(function (p) { p.classList.remove('active'); });
  var bv = document.getElementById('btn-volver');
  if (bv) bv.style.display = 'none';
}

function handleNavLinks() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      if (document.getElementById('mainContent').style.display === 'none') {
        showMain();
      }
      toggleNav(); // close mobile nav if open
    });
  });
}

/* ===========================================================
   NAV MOVIL
   =========================================================== */
function toggleNav() { document.getElementById('mainNav').classList.toggle('open'); }

/* ===========================================================
   COOKIES
   =========================================================== */
function acceptCookies() {
  localStorage.setItem('cookie_consent', '1');
  document.getElementById('cookieBar').style.display = 'none';
}
if (localStorage.getItem('cookie_consent')) {
  document.getElementById('cookieBar').style.display = 'none';
}

/* ===========================================================
   FORMULARIO DE CONTACTO
   =========================================================== */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    const success = document.getElementById('contact-success');

    btn.disabled = true;
    btn.textContent = 'Enviando...';

    const formData = new FormData(form);

    fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    })
      .then(response => {
        if (response.ok) {
          success.style.display = 'block';
          form.reset();
        } else {
          alert('Hubo un problema al enviar el mensaje. Por favor, intenta de nuevo.');
        }
      })
      .catch(error => {
        alert('Error de conexion. Revisa tu internet e intenta de nuevo.');
      })
      .finally(() => {
        btn.disabled = false;
        btn.textContent = 'Enviar Mensaje';
      });
  });
}

/* ===========================================================
   INIT
   =========================================================== */
window.addEventListener('DOMContentLoaded', function () {
  updateSliderFill();
  calcular();
  handleNavLinks();
  initContactForm();
});