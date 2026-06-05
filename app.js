/* ============================================================
   Piektoets Woningbouw — interactions
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Scroll progress ---------- */
  var bar = document.querySelector('.progress');
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var p = max > 0 ? (h.scrollTop / max) * 100 : 0;
    if (bar) bar.style.width = p + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll ---------- */
  var revEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revEls.forEach(function (el) { ro.observe(el); });
  } else {
    revEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Dot nav active state ---------- */
  var navDots = Array.prototype.slice.call(document.querySelectorAll('.dotnav a'));
  var sections = navDots.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  if ('IntersectionObserver' in window && sections.length) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var i = sections.indexOf(e.target);
          navDots.forEach(function (d, j) { d.classList.toggle('active', j === i); });
        }
      });
    }, { threshold: 0.5 });
    sections.forEach(function (s) { if (s) so.observe(s); });
  }

  /* ---------- Count-up numbers (stat cards) ---------- */
  function animateCount(el, to, opts) {
    opts = opts || {};
    var dec = opts.dec || 0;
    var dur = opts.dur || 1100;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var t = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      var val = to * eased;
      el.textContent = formatNL(val, dec);
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = formatNL(to, dec);
    }
    requestAnimationFrame(step);
  }
  function formatNL(v, dec) {
    return v.toLocaleString('nl-NL', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var el = e.target;
          animateCount(el, parseFloat(el.getAttribute('data-count')), { dec: parseInt(el.getAttribute('data-dec') || '0', 10) });
          co.unobserve(el);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* ---------- Heatmap (synthetic 24h × 14d residential load) ---------- */
  var heatmap = document.querySelector('.heatmap');
  if (heatmap) {
    var days = 14, hours = 24;
    // base hourly profile: morning bump + strong evening peak (HP + cooking + EV)
    var hourBase = [22,18,15,13,12,13,20,38,42,33,28,27,30,28,27,30,42,68,92,96,84,64,42,30];
    var frag = document.createDocumentFragment();
    for (var d = 0; d < days; d++) {
      var cold = 1 + (d % 7 === 5 || d % 7 === 6 ? 0.18 : 0) + (d === 9 ? 0.35 : 0); // weekend + cold snap
      for (var hh = 0; hh < hours; hh++) {
        var v = hourBase[hh] * cold * (0.85 + Math.random() * 0.3);
        v = Math.max(0, Math.min(100, v));
        var cell = document.createElement('i');
        cell.style.background = heatColor(v);
        cell.title = 'dag ' + (d + 1) + ' · ' + (hh < 10 ? '0' + hh : hh) + ':00 — belasting ' + Math.round(v) + '%';
        frag.appendChild(cell);
      }
    }
    heatmap.appendChild(frag);
    heatmap.style.gridTemplateColumns = 'repeat(' + hours + ', 1fr)';
  }
  function heatColor(v) {
    // 0..100 → sky-blue (low) → green → navy/red (high peak)
    if (v < 25) return '#e3f0f9';
    if (v < 42) return '#bfdcf1';
    if (v < 58) return '#8cc0e6';
    if (v < 72) return '#5b9fd0';
    if (v < 85) return '#e8a33d';
    return '#c0392b';
  }

  /* ---------- Accordion ---------- */
  document.querySelectorAll('.accordion .q').forEach(function (q) {
    q.addEventListener('click', function () {
      var item = q.closest('.item');
      var a = item.querySelector('.a');
      var open = item.classList.toggle('open');
      a.style.maxHeight = open ? a.scrollHeight + 'px' : '0px';
    });
  });

  /* ============================================================
     WONINGBOUWVERGELIJKER
     ============================================================ */
  var SCEN = {
    basis: {
      name: 'Basis', reduc: 0, peak: 2.53, homes: 150, extra: 0, growth: 0,
      ruimte: { lvl: 0, txt: 'Geen maatregel' },
      infra: { lvl: 0, txt: 'Geen ingreep' },
      haalb: { lvl: 0, txt: 'Geen groei mogelijk' },
      policy: { t: 'Geen beleid', d: 'Zonder maatregel is de netcapaciteit de harde grens: deze wijk zit vol bij 150 woningen.' },
      warn: false
    },
    s1: {
      name: 'S1 · Slim laden EV', reduc: 30, peak: 1.77, homes: 215, extra: 65, growth: 43,
      ruimte: { lvl: 1, txt: 'Geen fysieke ruimte nodig' },
      infra: { lvl: 1, txt: 'Slimme meters + TOU-tarieven (bestaande infra)' },
      haalb: { lvl: 3, txt: 'Direct haalbaar — stuurt gedrag via prijs, geen contracten' },
      policy: { t: 'Beleid: TOU-tarieven', d: 'Een financiële prikkel verschuift het laden weg van de avondpiek. Volgens de expert de meest haalbare eerste stap.' },
      warn: false
    },
    s2: {
      name: 'S2 · Buurtbatterij + PV', reduc: 40, peak: 1.52, homes: 250, extra: 100, growth: 67,
      ruimte: { lvl: 3, txt: 'Vraagt ruimte voor batterij + PV-daken' },
      infra: { lvl: 2, txt: 'Lokale opslag + opwek; dempt ook teruglever-piek' },
      haalb: { lvl: 1, txt: 'Technisch sterk, maar juridisch/financieel complex' },
      policy: { t: 'Beleid: subsidie + sturing', d: 'Subsidie op buurt-/thuisbatterijen, plus software die batterijen op congestie aanstuurt in plaats van marktprijs.' },
      warn: false
    },
    s3: {
      name: 'S3 · Vermogenslimiet', reduc: 50, peak: 1.27, homes: 300, extra: 150, growth: 100,
      ruimte: { lvl: 1, txt: 'Geen extra ruimte nodig' },
      infra: { lvl: 2, txt: 'Smart-control om warmtepompen te begrenzen' },
      haalb: { lvl: 2, txt: 'Operationeel het krachtigst, maar ingrijpend in comfort' },
      policy: { t: 'Beleid: juridische vermogenslimiet', d: 'Warmtepompen worden op piekmomenten begrensd (throttling). Rebound-pieken blijven beheersbaar met slimme sturing.' },
      warn: false
    },
    combi: {
      name: 'Combinatie', reduc: 80, peak: 0.51, homes: 751, extra: 601, growth: 300,
      ruimte: { lvl: 2, txt: 'Mix van ruimte- en sturingsmaatregelen' },
      infra: { lvl: 3, txt: 'Gecoördineerde aansturing vereist' },
      haalb: { lvl: 2, txt: 'Maximaal effect (≈4×), vraagt strakke regie' },
      policy: { t: 'Beleid: piektoets + maatregelpakket', d: 'Alle drie samen, gecapt op 80%. Let op: naïef off-peak verschuiven kan juist nieuwe synchronisatiepieken veroorzaken.' },
      warn: true
    }
  };

  var BASE_HOMES = 150;
  var MAX_PEAK = 2.53; // basis peak for gauge scale
  var TOTAL_UNITS = 150; // dotgrid units; 1 unit = 5 homes
  var PER_UNIT = 5;

  var elV = document.getElementById('cmp-homes');
  var elDelta = document.getElementById('cmp-delta');
  var elGaugeFill = document.getElementById('gauge-fill');
  var elGaugeVal = document.getElementById('gauge-val');
  var dotgrid = document.getElementById('dotgrid');
  var effRuimte = document.getElementById('eff-ruimte');
  var effInfra = document.getElementById('eff-infra');
  var effHaalb = document.getElementById('eff-haalb');
  var elPolicy = document.getElementById('cmp-policy');
  var scnBtns = document.querySelectorAll('.scn button');

  // build dot grid
  if (dotgrid) {
    for (var u = 0; u < TOTAL_UNITS; u++) {
      var dv = document.createElement('div');
      dv.className = 'u';
      dotgrid.appendChild(dv);
    }
  }
  var units = dotgrid ? dotgrid.querySelectorAll('.u') : [];

  var curHomes = BASE_HOMES;
  function setScenario(key, animate) {
    var s = SCEN[key];
    if (!s) return;

    scnBtns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-scn') === key); });

    // big number count
    if (elV) {
      var from = curHomes, to = s.homes, st = null, dur = 900;
      (function run(ts) {
        if (!st) st = ts;
        var t = Math.min((ts - st) / dur, 1);
        var e = 1 - Math.pow(1 - t, 3);
        var val = Math.round(from + (to - from) * e);
        elV.firstChild.textContent = formatNL(val, 0);
        if (t < 1) requestAnimationFrame(run);
        else { elV.firstChild.textContent = formatNL(to, 0); curHomes = to; }
      })(performance.now ? performance.now() : Date.now());
      if (!('requestAnimationFrame' in window)) { elV.firstChild.textContent = formatNL(to, 0); curHomes = to; }
    }

    // delta pills
    if (elDelta) {
      if (s.extra === 0) {
        elDelta.innerHTML = '<span class="pill muted">huidige praktijk · geen groei</span>';
      } else {
        elDelta.innerHTML =
          '<span class="pill">+' + formatNL(s.extra, 0) + ' woningen</span>' +
          '<span class="pill">+' + s.growth + '% t.o.v. basis</span>';
      }
    }

    // gauge (peak per home) — lower is better, fill shows remaining peak vs base
    if (elGaugeFill) {
      var pctPeak = Math.max(4, (s.peak / MAX_PEAK) * 100);
      elGaugeFill.style.width = pctPeak + '%';
    }
    if (elGaugeVal) {
      elGaugeVal.innerHTML = 'piek per woning <b>' + formatNL(s.peak, 2).replace('.', ',') + ' kW</b>' +
        (s.reduc > 0 ? ' &nbsp;·&nbsp; −' + s.reduc + '% piekreductie' : '');
    }

    // dot grid fill
    var fillUnits = Math.round(s.homes / PER_UNIT);
    var baseUnits = Math.round(BASE_HOMES / PER_UNIT);
    for (var i = 0; i < units.length; i++) {
      var cls = 'u';
      if (i < baseUnits) cls += ' base';
      else if (i < fillUnits) cls += ' extra';
      units[i].className = cls;
      if (animate) units[i].style.transitionDelay = (i * 5) + 'ms';
    }

    // effect meters
    paintEff(effRuimte, s.ruimte, false);
    paintEff(effInfra, s.infra, s.warn);
    paintEff(effHaalb, s.haalb, false);

    // policy
    if (elPolicy) {
      elPolicy.querySelector('.t').innerHTML = '<b>' + s.policy.t + '</b>' + s.policy.d;
    }
  }

  function paintEff(root, data, warn) {
    if (!root) return;
    root.classList.toggle('warn', !!warn);
    var segs = root.querySelectorAll('.segs i');
    segs.forEach(function (seg, idx) { seg.classList.toggle('on', idx < data.lvl); });
    var ev = root.querySelector('.ev');
    if (ev) ev.textContent = data.txt;
  }

  scnBtns.forEach(function (b) {
    b.addEventListener('click', function () { setScenario(b.getAttribute('data-scn'), true); });
  });

  // init on first view of comparer
  var cmpSection = document.getElementById('vergelijker');
  var inited = false;
  if (cmpSection && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !inited) { inited = true; setScenario('s1', true); }
      });
    }, { threshold: 0.25 });
    io.observe(cmpSection);
  } else {
    setScenario('s1', false);
  }

  /* ---------- year ---------- */
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();
})();
