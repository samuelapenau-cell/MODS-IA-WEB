var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
var isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

(function () {
  if (isMobile) return;
  var grid = document.getElementById('modGridInner');
  if (!grid) return;

  var COLS = 18, ROWS = 22;
  var TOTAL = COLS * ROWS;
  var cells = [];
  var cursorX = -1, cursorY = -1;
  var trail = {};
  var cellW;

  for (var i = 0; i < TOTAL; i++) {
    var el = document.createElement('div');
    el.className = 'mod-cell';
    grid.appendChild(el);
    cells.push(el);
  }

  cellW = window.innerWidth / COLS;
  window.addEventListener('resize', function () { cellW = window.innerWidth / COLS; });

  document.addEventListener('mousemove', function (e) {
    var col = Math.floor(e.clientX / cellW);
    var row = Math.floor(e.clientY / cellW);
    col = Math.max(0, Math.min(COLS - 1, col));
    row = Math.max(0, Math.min(ROWS - 1, row));
    if (col !== cursorX || row !== cursorY) {
      var prevIdx = idx(cursorX, cursorY);
      if (cursorX >= 0 && !trail[prevIdx]) trail[prevIdx] = 0.5;
      cursorX = col; cursorY = row;
    }
  }, { passive: true });

  document.addEventListener('mouseleave', function () {
    cursorX = -1; cursorY = -1;
  });

  var t = 0;
  var hidden = false;
  function animate() {
    if (reducedMotion) return;
    if (hidden) { requestAnimationFrame(animate); return; }
    t += 0.018;

    var trailKeys = Object.keys(trail);
    for (var ti = 0; ti < trailKeys.length; ti++) {
      var key = trailKeys[ti];
      trail[key] -= 0.025;
      if (trail[key] <= 0) delete trail[key];
    }

    var cx = cursorX, cy = cursorY;
    var hasCursor = cx >= 0 && cy >= 0;

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var idxVal = idx(c, r);
        var el = cells[idxVal];

        var wave1 = Math.sin(c * 0.18 + t * 1.6) * 0.5 + 0.5;
        var wave2 = Math.sin(r * 0.15 + t * 1.2 + 1.2) * 0.5 + 0.5;
        var wave3 = Math.sin((c + r) * 0.12 - t * 0.9) * 0.5 + 0.5;
        var ambient = (wave1 * 0.3 + wave2 * 0.3 + wave3 * 0.4) * 0.025 + 0.004;

        if (hasCursor) {
          var dc = c - cx, dr = r - cy;
          var dist = Math.sqrt(dc * dc + dr * dr);
          if (dist < 5) {
            var glow = 1 - dist / 5;
            ambient += glow * glow * 0.3;
          }
        }

        var trailKey = String(idxVal);
        if (trail[trailKey]) {
          ambient += trail[trailKey] * 0.12;
        }

        ambient = Math.min(ambient, 0.55);
        el.style.background = 'rgba(81,112,255,' + ambient.toFixed(4) + ')';
      }
    }

    requestAnimationFrame(animate);
  }

  function idx(col, row) { return row * COLS + col; }

  animate();
})();

(function () {
  var canvas = document.getElementById('globeCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H, R;
  var dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);

  var mouseX = 0, mouseY = 0;
  var targetRotX = 0, targetRotY = 0;
  var curRotX = 0, curRotY = 0;

  function resize() {
    var rect = canvas.parentElement.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) * 0.46;
  }

  if (!isMobile) {
    canvas.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left - W / 2) / (W / 2);
      mouseY = (e.clientY - rect.top - H / 2) / (H / 2);
    }, { passive: true });
    canvas.addEventListener('mouseleave', function () { mouseX = 0; mouseY = 0; });
  }

  var LATS = isMobile ? 10 : 24, LONS = isMobile ? 12 : 28;
  var verts = [];
  for (var i = 0; i <= LATS; i++) {
    var theta = (i / LATS) * Math.PI;
    var ring = [];
    for (var j = 0; j < LONS; j++) {
      var phi = (j / LONS) * 2 * Math.PI;
      ring.push({
        x: Math.sin(theta) * Math.cos(phi),
        y: Math.cos(theta),
        z: Math.sin(theta) * Math.sin(phi)
      });
    }
    verts.push(ring);
  }

  var NODES_N = isMobile ? 8 : 45;
  var nodes = [];
  for (var i = 0; i < NODES_N; i++) {
    var theta = Math.random() * 2 * Math.PI;
    var phi = Math.acos(2 * Math.random() - 1);
    nodes.push({
      x: Math.sin(phi) * Math.cos(theta),
      y: Math.cos(phi),
      z: Math.sin(phi) * Math.sin(theta),
      pulsePhase: Math.random() * 2 * Math.PI,
      size: 0.8 + Math.random() * 1.2
    });
  }

  var connections = [];
  var CONN_DIST = 1.7;
  if (!isMobile) {
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var dx = nodes[i].x - nodes[j].x;
        var dy = nodes[i].y - nodes[j].y;
        var dz = nodes[i].z - nodes[j].z;
        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < CONN_DIST && dist > 0.3 && Math.random() < 0.2) {
          var packets = [];
          var numP = 1 + Math.floor(Math.random() * 3);
          for (var p = 0; p < numP; p++) {
            packets.push({
              progress: Math.random(),
              speed: 0.001 + Math.random() * 0.007,
              size: 1 + Math.random() * 2
            });
          }
          connections.push({ a: i, b: j, dist: dist, packets: packets });
        }
      }
    }
  }

  var PARTICLE_N = isMobile ? 15 : 160;
  var particles = [];
  for (var i = 0; i < PARTICLE_N; i++) {
    var theta = Math.random() * 2 * Math.PI;
    var phi = Math.acos(2 * Math.random() - 1);
    var r = 1.3 + Math.random() * 2.5;
    particles.push({
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.cos(phi),
      z: r * Math.sin(phi) * Math.sin(theta),
      speed: 0.05 + Math.random() * 0.3,
      phase: Math.random() * 2 * Math.PI,
      size: 0.4 + Math.random() * 1.4,
      opacity: 0.15 + Math.random() * 0.45
    });
  }

  var STARS_N = isMobile ? 20 : 220;
  var stars = [];
  for (var i = 0; i < STARS_N; i++) {
    stars.push({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      size: 0.3 + Math.random() * 1.2,
      twinkle: Math.random() * 2 * Math.PI,
      speed: 0.5 + Math.random() * 1.5
    });
  }

  var orbDefs = isMobile ? [
    { tilt: 0.3, radius: 1.35, speed: 0.35, phase: 0, color: 'rgba(81,112,255,0.12)', width: 1.5 }
  ] : [
    { tilt: 0.3, radius: 1.35, speed: 0.35, phase: 0, color: 'rgba(81,112,255,0.12)', width: 1.5 },
    { tilt: -0.5, radius: 1.55, speed: -0.28, phase: 2.0, color: 'rgba(123,146,255,0.08)', width: 1.0 },
    { tilt: 0.6, radius: 1.18, speed: 0.42, phase: 1.5, color: 'rgba(203,212,255,0.06)', width: 0.8 },
    { tilt: -0.2, radius: 1.7, speed: -0.2, phase: 0.8, color: 'rgba(81,112,255,0.05)', width: 0.6 }
  ];

  function rotate(v, rx, ry) {
    var x = v.x, y = v.y, z = v.z;
    var cy = Math.cos(ry), sy = Math.sin(ry);
    var x1 = x * cy + z * sy;
    var z1 = -x * sy + z * cy;
    var cx = Math.cos(rx), sx = Math.sin(rx);
    return { x: x1, y: y * cx - z1 * sx, z: y * sx + z1 * cx };
  }

  function project(v, rx, ry) {
    var rv = rotate(v, rx, ry);
    var persp = 600 / (600 + rv.z * R);
    return {
      sx: W / 2 + rv.x * R * persp,
      sy: H / 2 + rv.y * R * persp,
      depth: rv.z, persp: persp
    };
  }

  function mid3D(a, b, lift) {
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, mz = (a.z + b.z) / 2;
    var len = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
    return { x: mx + (mx / len) * lift, y: my + (my / len) * lift, z: mz + (mz / len) * lift };
  }

  var angle = 0, time = 0;
  var hidden = false;

  function bezier3D(a, b, c, t) {
    var u = 1 - t;
    return {
      x: u * u * a.x + 2 * u * t * b.x + t * t * c.x,
      y: u * u * a.y + 2 * u * t * b.y + t * t * c.y,
      z: u * u * a.z + 2 * u * t * b.z + t * t * c.z
    };
  }

  function animate() {
    if (reducedMotion) return;
    if (hidden) { requestAnimationFrame(animate); return; }
    angle += 0.004;
    time += 0.016;

    targetRotX = Math.sin(angle * 0.15) * 0.12 + mouseY * 0.35;
    targetRotY = angle + mouseX * 0.5;
    curRotX += (targetRotX - curRotX) * 0.04;
    curRotY += (targetRotY - curRotY) * 0.04;
    var rx = curRotX, ry = curRotY;

    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * s.speed + s.twinkle));
      ctx.beginPath();
      ctx.arc(W / 2 + s.x * W * 0.5, H / 2 + s.y * W * 0.5, s.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200,210,255,' + (tw * 0.5).toFixed(3) + ')';
      ctx.fill();
    }

    var pulse = 0.85 + 0.15 * Math.sin(time * 0.8);
    var cg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, R * 1.6);
    cg.addColorStop(0, 'rgba(81,112,255,' + (0.08 * pulse).toFixed(3) + ')');
    cg.addColorStop(0.3, 'rgba(81,112,255,' + (0.04 * pulse).toFixed(3) + ')');
    cg.addColorStop(0.6, 'rgba(123,146,255,' + (0.02 * pulse).toFixed(3) + ')');
    cg.addColorStop(1, 'rgba(81,112,255,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    ctx.arc(W / 2, H / 2, R * 0.98, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(81,112,255,' + (0.035 * pulse).toFixed(3) + ')';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    var pc = [];
    for (var i = 0; i <= LATS; i++) {
      var row = [];
      for (var j = 0; j < LONS; j++) {
        row.push(project(verts[i][j], rx, ry));
      }
      pc.push(row);
    }

    var pn = [];
    for (var i = 0; i < nodes.length; i++) {
      pn.push(project(nodes[i], rx, ry));
    }

    if (!isMobile) {
      for (var i = 0; i <= LATS; i++) {
        ctx.beginPath();
        var started = false;
        for (var j = 0; j <= LONS; j++) {
          var p = pc[i][j % LONS];
          if (p.depth < 0) {
            if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
            else ctx.lineTo(p.sx, p.sy);
          } else started = false;
        }
        ctx.strokeStyle = 'rgba(81,112,255,0.04)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      for (var j = 0; j < LONS; j++) {
        ctx.beginPath();
        var started = false;
        for (var i = 0; i <= LATS; i++) {
          var p = pc[i][j];
          if (p.depth < 0) {
            if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
            else ctx.lineTo(p.sx, p.sy);
          } else started = false;
        }
        ctx.strokeStyle = 'rgba(81,112,255,0.04)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      for (var ci = 0; ci < connections.length; ci++) {
        var conn = connections[ci];
        var pA = pn[conn.a], pB = pn[conn.b];
        if (pA.depth < -0.1 && pB.depth < -0.1) {
          var mid = mid3D(nodes[conn.a], nodes[conn.b], 0.35 + conn.dist * 0.15);
          var pM = project(mid, rx, ry);
          var avgD = (pA.depth + pB.depth + pM.depth) / 3;
          if (avgD < 0) {
            var aVal = Math.min(0.08, Math.abs(avgD) * 0.12);
            ctx.beginPath();
            ctx.moveTo(pA.sx, pA.sy);
            ctx.quadraticCurveTo(pM.sx, pM.sy, pB.sx, pB.sy);
            ctx.strokeStyle = 'rgba(81,112,255,' + aVal.toFixed(3) + ')';
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }
    }

    for (var i = 0; i <= LATS; i++) {
      ctx.beginPath();
      var started = false;
      for (var j = 0; j <= LONS; j++) {
        var p = pc[i][j % LONS];
        if (p.depth >= 0) {
          if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
          else ctx.lineTo(p.sx, p.sy);
        } else started = false;
      }
      var aVal = 0.10 + 0.18 * (1 - Math.abs(i / LATS - 0.5) * 0.6);
      ctx.strokeStyle = 'rgba(81,112,255,' + aVal.toFixed(3) + ')';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    for (var j = 0; j < LONS; j++) {
      ctx.beginPath();
      var started = false;
      for (var i = 0; i <= LATS; i++) {
        var p = pc[i][j];
        if (p.depth >= 0) {
          if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
          else ctx.lineTo(p.sx, p.sy);
        } else started = false;
      }
      ctx.strokeStyle = 'rgba(81,112,255,0.09)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    if (!isMobile) {
      for (var ci = 0; ci < connections.length; ci++) {
        var conn = connections[ci];
        var pA = pn[conn.a], pB = pn[conn.b];
        if (pA.depth < -0.1 && pB.depth < -0.1) continue;

        var mid = mid3D(nodes[conn.a], nodes[conn.b], 0.35 + conn.dist * 0.15);
        var pM = project(mid, rx, ry);
        var avgD = (pA.depth + pB.depth + pM.depth) / 3;

        if (avgD > -0.2) {
          var alpha = Math.min(0.55, (avgD + 0.3) * 0.35);
          var grad = ctx.createLinearGradient(pA.sx, pA.sy, pB.sx, pB.sy);
          grad.addColorStop(0, 'rgba(81,112,255,' + (alpha * 0.3).toFixed(3) + ')');
          grad.addColorStop(0.5, 'rgba(123,146,255,' + (alpha * 0.6).toFixed(3) + ')');
          grad.addColorStop(1, 'rgba(81,112,255,' + (alpha * 0.3).toFixed(3) + ')');

          ctx.beginPath();
          ctx.moveTo(pA.sx, pA.sy);
          ctx.quadraticCurveTo(pM.sx, pM.sy, pB.sx, pB.sy);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 0.8 + alpha * 0.6;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(pA.sx, pA.sy);
          ctx.quadraticCurveTo(pM.sx, pM.sy, pB.sx, pB.sy);
          ctx.strokeStyle = 'rgba(81,112,255,' + (alpha * 0.06).toFixed(3) + ')';
          ctx.lineWidth = 5;
          ctx.stroke();

          for (var pk = 0; pk < conn.packets.length; pk++) {
            var packet = conn.packets[pk];
            packet.progress += packet.speed;
            if (packet.progress > 1) packet.progress -= 1;
            var t = packet.progress;
            var pos = bezier3D(nodes[conn.a], mid, nodes[conn.b], t);
            var pp = project(pos, rx, ry);
            if (pp.depth > -0.1) {
              var pa = Math.min(0.85, (pp.depth + 0.3) * 0.5);
              ctx.beginPath();
              ctx.arc(pp.sx, pp.sy, packet.size * 3.5, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(123,146,255,' + (pa * 0.12).toFixed(3) + ')';
              ctx.fill();
              ctx.beginPath();
              ctx.arc(pp.sx, pp.sy, packet.size * 1.2, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(180,200,255,' + pa.toFixed(2) + ')';
              ctx.fill();
              ctx.beginPath();
              ctx.arc(pp.sx, pp.sy, packet.size * 0.4, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(230,235,255,' + pa.toFixed(2) + ')';
              ctx.fill();
            }
          }
        }
      }
    }

    for (var i = 0; i < pn.length; i++) {
      var p = pn[i];
      if (p.depth > 0) {
        var np = 0.5 + 0.5 * Math.sin(time * 1.5 + nodes[i].pulsePhase);
        var aVal = Math.min(0.8, p.depth * 0.4 + 0.2);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 5 + np * 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(81,112,255,' + (aVal * 0.08 * np).toFixed(3) + ')';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 2.5 + np * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(129,155,255,' + (aVal * 0.25).toFixed(3) + ')';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200,215,255,' + aVal.toFixed(2) + ')';
        ctx.fill();
      }
    }

    var segs = 64;
    for (var o = 0; o < orbDefs.length; o++) {
      var def = orbDefs[o];
      ctx.beginPath();
      var started = false;
      for (var s = 0; s <= segs; s++) {
        var aVal = (s / segs) * 2 * Math.PI;
        var ex = def.radius * Math.cos(aVal);
        var ey = def.radius * Math.sin(aVal) * 0.25;
        var ez = def.radius * Math.sin(aVal) * 0.75;
        var ct = Math.cos(def.tilt), st = Math.sin(def.tilt);
        var rv = rotate({ x: ex, y: ey * ct - ez * st, z: ey * st + ez * ct }, rx, ry);
        if (rv.z > -0.05) {
          var persp = 600 / (600 + rv.z * R);
          var sx = W / 2 + rv.x * R * persp;
          var sy = H / 2 + rv.y * R * persp;
          if (!started) { ctx.moveTo(sx, sy); started = true; }
          else ctx.lineTo(sx, sy);
        } else started = false;
      }
      ctx.strokeStyle = def.color;
      ctx.lineWidth = def.width;
      ctx.stroke();

      var oa = angle * def.speed + def.phase;
      var numDots = 3;
      for (var d = 0; d < numDots; d++) {
        var da = oa + (d / numDots) * 2 * Math.PI;
        var dx = def.radius * Math.cos(da);
        var dy = def.radius * Math.sin(da) * 0.25;
        var dz = def.radius * Math.sin(da) * 0.75;
        var ct = Math.cos(def.tilt), st = Math.sin(def.tilt);
        var rd = rotate({ x: dx, y: dy * ct - dz * st, z: dy * st + dz * ct }, rx, ry);
        if (rd.z > 0) {
          var persp = 600 / (600 + rd.z * R);
          var sx = W / 2 + rd.x * R * persp;
          var sy = H / 2 + rd.y * R * persp;
          var da2 = Math.min(0.7, rd.z * 0.5);
          ctx.beginPath();
          ctx.arc(sx, sy, 2.5, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(180,200,255,' + da2.toFixed(2) + ')';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(sx, sy, 6, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(81,112,255,' + (da2 * 0.1).toFixed(3) + ')';
          ctx.fill();
        }
      }
    }

    for (var i = 0; i < particles.length; i++) {
      var pt = particles[i];
      var rv = rotate(pt, rx + Math.sin(time * pt.speed + pt.phase) * 0.02, ry + Math.cos(time * pt.speed + pt.phase) * 0.02);
      if (rv.z > 0) {
        var persp = 600 / (600 + rv.z * R);
        var sx = W / 2 + rv.x * R * persp;
        var sy = H / 2 + rv.y * R * persp;
        var aVal = Math.min(pt.opacity, rv.z * 0.35) * 0.55;
        ctx.beginPath();
        ctx.arc(sx, sy, pt.size * persp, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(123,146,255,' + aVal.toFixed(3) + ')';
        ctx.fill();
      }
    }

    var scanY = ((time * 0.2) % 2 - 1) * R;
    if (scanY > -R && scanY < R) {
      ctx.beginPath();
      for (var s = 0; s < LONS; s++) {
        var col = Math.floor(s);
        var found = false;
        for (var r = 0; r <= LATS; r++) {
          var pp = pc[r][col];
          if (Math.abs(pp.sy - (H / 2 + scanY)) < 3.5 && pp.depth > 0) {
            if (!found) { ctx.moveTo(pp.sx - 4, pp.sy); found = true; }
            ctx.lineTo(pp.sx + 4, pp.sy);
          }
        }
      }
      ctx.strokeStyle = 'rgba(129,155,255,0.12)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      for (var s = 0; s < LONS; s++) {
        var col = Math.floor(s);
        var found = false;
        for (var r = 0; r <= LATS; r++) {
          var pp = pc[r][col];
          if (Math.abs(pp.sy - (H / 2 + scanY)) < 3.5 && pp.depth > 0) {
            if (!found) { ctx.moveTo(pp.sx - 8, pp.sy); found = true; }
            ctx.lineTo(pp.sx + 8, pp.sy);
          }
        }
      }
      ctx.strokeStyle = 'rgba(81,112,255,0.04)';
      ctx.lineWidth = 6;
      ctx.stroke();
    }

    for (var pw = 0; pw < 2; pw++) {
      var ph = (time * 0.25 + pw * 0.6) % 1;
      var pr = R * (0.5 + ph * 0.9);
      var pa = (1 - ph) * 0.10;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, pr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(81,112,255,' + pa.toFixed(3) + ')';
      ctx.lineWidth = 1.2 * (1 - ph) + 0.3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, pr * 1.08, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(123,146,255,' + (pa * 0.4).toFixed(3) + ')';
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }

    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  resize();
  animate();
})();

var navbar = document.getElementById('navbar');
var navToggle = document.getElementById('navToggle');
var navLinks = document.getElementById('navLinks');
var sections = document.querySelectorAll('section[id]');

var ticking = false;
window.addEventListener('scroll', function () {
  if (!ticking) {
    requestAnimationFrame(function () {
      var sy = window.scrollY;
      navbar.classList.toggle('scrolled', sy > 40);
      var current = '';
      sections.forEach(function (s) {
        if (sy >= s.offsetTop - 120) current = s.getAttribute('id');
      });
      document.querySelectorAll('.nav-links a:not(.nav-cta)').forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('href') === '#' + current);
      });
      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });

navToggle.addEventListener('click', function () {
  var isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
  if (isOpen) {
    var firstLink = navLinks.querySelector('a');
    if (firstLink) firstLink.focus();
  }
});

navLinks.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.focus();
  }
});

document.querySelectorAll('.nav-links a').forEach(function (link) {
  link.addEventListener('click', function () {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.focus();
  });
});

var observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      staggerItems(entry.target);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

function staggerItems(root) {
  if (root.dataset.stagger) {
    var delay = parseInt(root.dataset.stagger) || 80;
    var children = root.children;
    var idx = 0;
    for (var i = 0; i < children.length; i++) {
      if (children[i].classList.contains('stagger-item')) {
        (function (index, el) {
          setTimeout(function () { el.classList.add('visible'); }, idx * delay);
        })(idx, children[i]);
        idx++;
      }
    }
  }
  for (var i = 0; i < root.children.length; i++) {
    if (root.children[i].dataset.stagger) {
      staggerItems(root.children[i]);
    }
  }
}

document.querySelectorAll('.reveal').forEach(function (el) { observer.observe(el); });

(function () {
  var chars = document.querySelectorAll('#heroHeadline .word-char');
  if (!chars.length) return;
  setTimeout(function () {
    var delay = 0;
    chars.forEach(function (el) {
      setTimeout(function () { el.classList.add('visible'); }, delay + 300);
      delay += 80;
    });
  }, 100);
})();

(function () {
  var form = document.getElementById('contactForm');
  if (!form) return;

  var nameInput = form.querySelector('[name="Nombre"]');
  var emailInput = form.querySelector('[name="Email"]');
  var phoneInput = form.querySelector('[name="Telefono"]');
  var companyInput = form.querySelector('[name="Empresa"]');
  var serviceInput = form.querySelector('[name="Interes"]');
  var messageInput = form.querySelector('[name="Mensaje"]');

  function getFieldError(el) {
    return el.parentElement.querySelector('.field-error');
  }

  function showError(el, msg) {
    var err = getFieldError(el);
    if (err) {
      err.textContent = msg;
      err.classList.add('visible');
    }
    el.parentElement.classList.add('input-error');
  }

  function clearError(el) {
    var err = getFieldError(el);
    if (err) {
      err.textContent = '';
      err.classList.remove('visible');
    }
    el.parentElement.classList.remove('input-error');
  }

  function clearAllErrors() {
    form.querySelectorAll('.field-error').forEach(function (e) {
      e.textContent = '';
      e.classList.remove('visible');
    });
    form.querySelectorAll('.input-error').forEach(function (e) {
      e.classList.remove('input-error');
    });
  }

  function sanitize(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.textContent;
  }

  function validate() {
    var valid = true;
    clearAllErrors();

    var name = nameInput.value.trim();
    if (name.length < 2) { showError(nameInput, 'Mínimo 2 caracteres'); valid = false; }
    if (name.length > 100) { showError(nameInput, 'Máximo 100 caracteres'); valid = false; }

    var email = emailInput.value.trim();
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) { showError(emailInput, 'Email inválido'); valid = false; }
    if (email.length > 200) { showError(emailInput, 'Email demasiado largo'); valid = false; }

    var phone = phoneInput.value.trim();
    if (phone.length > 0) {
      if (phone.length > 20) { showError(phoneInput, 'Teléfono demasiado largo'); valid = false; }
      var phoneClean = phone.replace(/[\s\-\(\)\+]/g, '');
      if (phoneClean.length < 7) { showError(phoneInput, 'Teléfono inválido (mín. 7 dígitos)'); valid = false; }
    }

    var company = companyInput.value.trim();
    if (company.length > 200) { showError(companyInput, 'Máximo 200 caracteres'); valid = false; }

    var message = messageInput.value.trim();
    if (message.length < 10) { showError(messageInput, 'Mínimo 10 caracteres'); valid = false; }
    if (message.length > 2000) { showError(messageInput, 'Máximo 2000 caracteres'); valid = false; }

    return valid;
  }

  [nameInput, emailInput, phoneInput, companyInput, messageInput].forEach(function (input) {
    input.addEventListener('input', function () {
      if (input.parentElement.classList.contains('input-error')) {
        clearError(input);
      }
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var honey = form.querySelector('[name="_honey"]');
    if (honey && honey.value) return;

    if (!validate()) return;

    var body = form.querySelector('.form-body');
    var success = form.querySelector('.form-success');
    var btn = form.querySelector('button[type="submit"]');
    var originalText = btn.innerHTML;

    var data = {
      Nombre: sanitize(nameInput.value),
      Email: sanitize(emailInput.value),
      Telefono: sanitize(phoneInput.value),
      Empresa: sanitize(companyInput.value),
      Interes: serviceInput.value,
      Mensaje: sanitize(messageInput.value)
    };

    btn.disabled = true;
    btn.classList.add('btn-loading');
    btn.innerHTML = '<span class="btn-spinner"></span><span class="btn-text">Enviando...</span>';

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (json) {
            throw new Error(json.error || 'Error del servidor');
          });
        }
        return res.json();
      })
      .then(function (json) {
        if (json.success) {
          body.classList.add('is-submitted');
          setTimeout(function () { success.classList.add('visible'); }, 200);
          setTimeout(function () {
            body.classList.remove('is-submitted');
            success.classList.remove('visible');
            form.reset();
            clearAllErrors();
            btn.disabled = false;
            btn.classList.remove('btn-loading');
            btn.innerHTML = originalText;
          }, 5000);
        } else {
          showError(messageInput, json.error || 'Error al enviar. Intenta de nuevo.');
          btn.disabled = false;
          btn.classList.remove('btn-loading');
          btn.innerHTML = originalText;
        }
      })
      .catch(function (err) {
        showError(messageInput, err.message || 'Error de conexión. Intenta de nuevo.');
        btn.disabled = false;
        btn.classList.remove('btn-loading');
        btn.innerHTML = originalText;
      });
  });
})();

(function () {
  var el = document.createElement('div');
  el.className = 'cursor-follower';
  document.body.appendChild(el);
  var tx = -100, ty = -100;
  var cx = -100, cy = -100;
  document.addEventListener('mousemove', function (e) {
    tx = e.clientX; ty = e.clientY;
    el.style.display = 'block';
  }, { passive: true });
  document.addEventListener('mouseleave', function () { el.style.display = 'none'; });
  document.querySelectorAll('a, button, .btn, input, textarea').forEach(function (n) {
    n.addEventListener('mouseenter', function () { el.classList.add('is-link'); });
    n.addEventListener('mouseleave', function () { el.classList.remove('is-link'); });
  });
  function follow() {
    cx += (tx - cx) * 0.12;
    cy += (ty - cy) * 0.12;
    el.style.transform = 'translate(' + cx + 'px, ' + cy + 'px) translate(-50%, -50%)';
    requestAnimationFrame(follow);
  }
  setTimeout(follow, 50);
})();

(function () {
  var bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(function () {
        var scrollTop = window.scrollY;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = pct + '%';
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

document.querySelectorAll('.btn').forEach(function (btn) {
  btn.addEventListener('click', function (e) {
    var rect = btn.getBoundingClientRect();
    var ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    var size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', function () { ripple.remove(); });
  });
});

(function () {
  var term = document.querySelector('.terminal-body');
  if (!term) return;
  var lines = Array.from(term.querySelectorAll('.terminal-line'));
  if (!lines.length) return;
  lines.forEach(function (l) { l.style.opacity = '0'; l.style.transform = 'translateY(6px)'; l.style.transition = 'opacity 0.35s ease, transform 0.35s ease'; });
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      observer.disconnect();
      lines.forEach(function (l, i) {
        setTimeout(function () {
          l.style.opacity = '1';
          l.style.transform = 'translateY(0)';
        }, 300 + i * 200);
      });
    });
  }, { threshold: 0.25 });
  observer.observe(term);
})();

(function () {
  var stats = document.querySelectorAll('.hero-stat h3');
  if (!stats.length) return;
  var targets = [];
  stats.forEach(function (s) {
    var text = s.textContent.trim();
    var prefix = text.charAt(0);
    var suffix = text.slice(-1);
    var numStr = text;
    if (prefix === '+' || prefix === '\u2212') numStr = text.slice(1);
    if (numStr.slice(-1) === '%' || numStr.slice(-1) === '+' || numStr.slice(-1) === 'K') numStr = numStr.slice(0, -1);
    var num = parseFloat(numStr);
    if (isNaN(num)) return;
    targets.push({ el: s, target: num, prefix: prefix === '+' || prefix === '\u2212' ? prefix : '', suffix: suffix === '%' || suffix === '+' || suffix === 'K' ? suffix : '', final: text });
    s.dataset.counted = 'false';
  });
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var idx = Array.from(stats).indexOf(entry.target);
      var t = targets[idx];
      if (!t || t.el.dataset.counted === 'true') return;
      t.el.dataset.counted = 'true';
      observer.unobserve(t.el);
      var start = 0;
      var duration = 1200 + Math.random() * 400;
      var startTime = performance.now();
      function count(now) {
        var p = Math.min((now - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = Math.round(eased * t.target);
        var display = val;
        if (t.target % 1 !== 0) display = (eased * t.target).toFixed(1);
        t.el.textContent = t.prefix + display + t.suffix;
        if (p < 1) requestAnimationFrame(count);
        else t.el.textContent = t.final;
      }
      requestAnimationFrame(count);
    });
  }, { threshold: 0.5 });
  stats.forEach(function (s) { observer.observe(s); });
})();
