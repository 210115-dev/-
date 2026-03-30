/**
 * 物理實驗模型 - JavaScript 物理引擎
 * Physics Experiment Model - Simulation Engine
 *
 * 實驗：
 *  1. 拋體運動 (Projectile Motion)
 *  2. 單擺     (Simple Pendulum)
 *  3. 彈簧振子 (Spring-Mass System)
 *  4. 圓周運動 (Uniform Circular Motion)
 */

'use strict';

/* ============================================================
   工具函式
   ============================================================ */

/** 度轉弧度 */
const toRad = (deg) => (deg * Math.PI) / 180;

/** 格式化數字（四捨五入到小數第二位） */
const fmt = (n, d = 2) => Number(n).toFixed(d);

/* ============================================================
   Tab 切換
   ============================================================ */
(function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  const sections = document.querySelectorAll('.tab-section');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      sections.forEach((s) => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
})();

/* ============================================================
   1. 拋體運動 (Projectile Motion)
   ============================================================ */
(function initProjectile() {
  const canvas = document.getElementById('projectileCanvas');
  const ctx = canvas.getContext('2d');

  // UI elements
  const v0Slider = document.getElementById('v0');
  const thetaSlider = document.getElementById('theta');
  const gSlider = document.getElementById('gProj');
  const v0Val = document.getElementById('v0Val');
  const thetaVal = document.getElementById('thetaVal');
  const gVal = document.getElementById('gVal');
  const infoBox = document.getElementById('projInfo');

  // State
  let animId = null;
  let running = false;
  let t = 0;
  let trail = [];

  // Physical scale: 1 pixel = SCALE metres
  const SCALE = 8; // px per metre
  const GROUND_Y = canvas.height - 40;
  const ORIGIN_X = 60;

  function getParams() {
    return {
      v0: parseFloat(v0Slider.value),
      theta: parseFloat(thetaSlider.value),
      g: parseFloat(gSlider.value),
    };
  }

  function physicsAt(v0, theta, g, t) {
    const rad = toRad(theta);
    const x = v0 * Math.cos(rad) * t;
    const y = v0 * Math.sin(rad) * t - 0.5 * g * t * t;
    const vx = v0 * Math.cos(rad);
    const vy = v0 * Math.sin(rad) - g * t;
    return { x, y, vx, vy };
  }

  function canvasPos(x, y) {
    return {
      cx: ORIGIN_X + x * SCALE,
      cy: GROUND_Y - y * SCALE,
    };
  }

  function drawScene(v0, theta, g, curT) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background grid
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx < canvas.width; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, canvas.height);
      ctx.stroke();
    }
    for (let gy = 0; gy < canvas.height; gy += 40) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(canvas.width, gy);
      ctx.stroke();
    }

    // Ground
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();

    // Draw full theoretical trajectory
    const rad = toRad(theta);
    const T_total = (2 * v0 * Math.sin(rad)) / g;
    const steps = 200;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(59,130,246,0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    for (let i = 0; i <= steps; i++) {
      const tt = (i / steps) * T_total;
      const { x, y } = physicsAt(v0, theta, g, tt);
      const { cx, cy } = canvasPos(x, y);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Trail
    if (trail.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.moveTo(trail[0].cx, trail[0].cy);
      for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].cx, trail[i].cy);
      ctx.stroke();
    }

    // Current position
    const { x, y, vx, vy } = physicsAt(v0, theta, g, curT);
    const { cx, cy } = canvasPos(x, y);
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Velocity vector
    const vScale = 3;
    ctx.beginPath();
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + vx * vScale, cy - vy * vScale);
    ctx.stroke();

    // Origin arrow
    ctx.fillStyle = '#60a5fa';
    ctx.font = '12px sans-serif';
    ctx.fillText('發射點', ORIGIN_X - 5, GROUND_Y + 20);

    // Info box
    const range = fmt((v0 * v0 * Math.sin(2 * rad)) / g);
    const height = fmt((v0 * v0 * Math.sin(rad) * Math.sin(rad)) / (2 * g));
    const flightTime = fmt(T_total);
    const speed = fmt(Math.sqrt(vx * vx + vy * vy));
    infoBox.innerHTML =
      `射程 R = ${range} m<br>` +
      `最大高度 H = ${height} m<br>` +
      `飛行時間 T = ${flightTime} s<br>` +
      `當前速率 v = ${speed} m/s<br>` +
      `t = ${fmt(curT)} s`;
  }

  function resetDraw() {
    running = false;
    if (animId) cancelAnimationFrame(animId);
    t = 0;
    trail = [];
    const { v0, theta, g } = getParams();
    drawScene(v0, theta, g, 0);
  }

  function animate() {
    const { v0, theta, g } = getParams();
    const rad = toRad(theta);
    const T_total = (2 * v0 * Math.sin(rad)) / g;

    if (t > T_total) {
      running = false;
      return;
    }

    const { x, y } = physicsAt(v0, theta, g, t);
    const { cx, cy } = canvasPos(x, y);
    trail.push({ cx, cy });
    drawScene(v0, theta, g, t);
    t += 0.04;
    animId = requestAnimationFrame(animate);
  }

  // Slider live-update
  [v0Slider, thetaSlider, gSlider].forEach((s) => {
    s.addEventListener('input', () => {
      v0Val.textContent = v0Slider.value;
      thetaVal.textContent = thetaSlider.value;
      gVal.textContent = gSlider.value;
      if (!running) resetDraw();
    });
  });

  document.getElementById('projStart').addEventListener('click', () => {
    if (running) return;
    t = 0;
    trail = [];
    running = true;
    animate();
  });

  document.getElementById('projReset').addEventListener('click', resetDraw);

  resetDraw();
})();

/* ============================================================
   2. 單擺 (Simple Pendulum)
   ============================================================ */
(function initPendulum() {
  const canvas = document.getElementById('pendulumCanvas');
  const ctx = canvas.getContext('2d');

  const LSlider = document.getElementById('pendL');
  const thetaSlider = document.getElementById('pendTheta');
  const gSlider = document.getElementById('pendG');
  const LVal = document.getElementById('pendLVal');
  const thetaVal = document.getElementById('pendThetaVal');
  const gVal = document.getElementById('pendGVal');
  const infoBox = document.getElementById('pendInfo');
  const playBtn = document.getElementById('pendPlay');

  let animId = null;
  let running = false;
  let angPos = 0; // current angle (rad)
  let angVel = 0; // angular velocity
  const DT = 0.016; // simulation step
  const SCALE = 120; // px per metre
  const PIVOT_X = canvas.width / 2;
  const PIVOT_Y = 60;

  function getParams() {
    return {
      L: parseFloat(LSlider.value),
      theta0: toRad(parseFloat(thetaSlider.value)),
      g: parseFloat(gSlider.value),
    };
  }

  function drawScene(L, theta, omega, g) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const bobX = PIVOT_X + Math.sin(theta) * L * SCALE;
    const bobY = PIVOT_Y + Math.cos(theta) * L * SCALE;

    // Equilibrium indicator
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PIVOT_X, PIVOT_Y);
    ctx.lineTo(PIVOT_X, PIVOT_Y + L * SCALE + 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // Angle arc
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(PIVOT_X, PIVOT_Y, 50, Math.PI / 2 - Math.abs(theta), Math.PI / 2, theta >= 0);
    ctx.stroke();

    // String
    ctx.beginPath();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.moveTo(PIVOT_X, PIVOT_Y);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();

    // Pivot
    ctx.fillStyle = '#475569';
    ctx.fillRect(PIVOT_X - 30, PIVOT_Y - 8, 60, 8);
    ctx.beginPath();
    ctx.arc(PIVOT_X, PIVOT_Y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#94a3b8';
    ctx.fill();

    // Bob
    const bobR = 16;
    const grad = ctx.createRadialGradient(bobX - 4, bobY - 4, 2, bobX, bobY, bobR);
    grad.addColorStop(0, '#93c5fd');
    grad.addColorStop(1, '#1d4ed8');
    ctx.beginPath();
    ctx.arc(bobX, bobY, bobR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Energy bar
    const { theta0 } = getParams();
    const Emax = g * L * (1 - Math.cos(theta0));
    const Ek = 0.5 * L * L * omega * omega;
    const Ep = g * L * (1 - Math.cos(theta));
    const barW = 160;
    const barX = canvas.width - barW - 20;
    const barY = 20;
    const barH = 12;

    const drawBar = (label, frac, color, yOff) => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(barX, barY + yOff, barW, barH);
      ctx.fillStyle = color;
      ctx.fillRect(barX, barY + yOff, barW * Math.min(frac, 1), barH);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px sans-serif';
      ctx.fillText(label, barX - 50, barY + yOff + barH - 1);
    };

    const Etotal = Emax > 0 ? Emax : 1;
    drawBar('動能 Ek', Ek / Etotal, '#f59e0b', 0);
    drawBar('位能 Ep', Ep / Etotal, '#10b981', 18);
    drawBar('總能 E', (Ek + Ep) / Etotal, '#3b82f6', 36);

    // Info
    const T_approx = 2 * Math.PI * Math.sqrt(L / g);
    infoBox.innerHTML =
      `擺長 L = ${fmt(L)} m<br>` +
      `當前角度 θ = ${fmt((theta * 180) / Math.PI)}°<br>` +
      `角速度 ω = ${fmt(omega, 3)} rad/s<br>` +
      `近似週期 T ≈ ${fmt(T_approx)} s`;
  }

  function resetState() {
    running = false;
    if (animId) cancelAnimationFrame(animId);
    const { theta0 } = getParams();
    angPos = theta0;
    angVel = 0;
    playBtn.textContent = '▶ 播放';
    const { L, g } = getParams();
    drawScene(L, angPos, angVel, g);
  }

  function step() {
    const { L, g } = getParams();
    // RK4 integration of θ'' = -(g/L)*sin(θ)
    const deriv = (pos, vel) => ({ dPos: vel, dVel: -(g / L) * Math.sin(pos) });
    const k1 = deriv(angPos, angVel);
    const k2 = deriv(angPos + k1.dPos * DT / 2, angVel + k1.dVel * DT / 2);
    const k3 = deriv(angPos + k2.dPos * DT / 2, angVel + k2.dVel * DT / 2);
    const k4 = deriv(angPos + k3.dPos * DT, angVel + k3.dVel * DT);

    angPos += (DT / 6) * (k1.dPos + 2 * k2.dPos + 2 * k3.dPos + k4.dPos);
    angVel += (DT / 6) * (k1.dVel + 2 * k2.dVel + 2 * k3.dVel + k4.dVel);
    drawScene(L, angPos, angVel, g);
    animId = requestAnimationFrame(step);
  }

  [LSlider, thetaSlider, gSlider].forEach((s) => {
    s.addEventListener('input', () => {
      LVal.textContent = LSlider.value;
      thetaVal.textContent = thetaSlider.value;
      gVal.textContent = gSlider.value;
      resetState();
    });
  });

  playBtn.addEventListener('click', () => {
    if (running) {
      running = false;
      cancelAnimationFrame(animId);
      playBtn.textContent = '▶ 播放';
    } else {
      running = true;
      playBtn.textContent = '⏸ 暫停';
      step();
    }
  });

  document.getElementById('pendReset').addEventListener('click', resetState);

  resetState();
})();

/* ============================================================
   3. 彈簧振子 (Spring-Mass System)
   ============================================================ */
(function initSpring() {
  const canvas = document.getElementById('springCanvas');
  const ctx = canvas.getContext('2d');

  const kSlider = document.getElementById('springK');
  const mSlider = document.getElementById('springM');
  const aSlider = document.getElementById('springA');
  const kVal = document.getElementById('springKVal');
  const mVal = document.getElementById('springMVal');
  const aVal = document.getElementById('springAVal');
  const infoBox = document.getElementById('springInfo');
  const playBtn = document.getElementById('springPlay');

  let animId = null;
  let running = false;
  let pos = 0; // displacement from equilibrium (m)
  let vel = 0;
  const DT = 0.016;
  const SCALE = 120; // px per metre
  const WALL_X = 60;
  const EQUILIBRIUM_X = canvas.width / 2;
  const CENTER_Y = canvas.height / 2;
  const BLOCK_W = 50;
  const BLOCK_H = 50;
  let graphData = [];

  function getParams() {
    return {
      k: parseFloat(kSlider.value),
      m: parseFloat(mSlider.value),
      A: parseFloat(aSlider.value),
    };
  }

  function drawSpring(ctx, x1, x2, y, coils, r) {
    const totalLen = x2 - x1;
    const segLen = totalLen / (coils * 2 + 2);
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x1 + segLen, y);
    for (let i = 0; i < coils; i++) {
      ctx.lineTo(x1 + segLen * (2 * i + 1) + segLen / 2, y - r);
      ctx.lineTo(x1 + segLen * (2 * i + 2) + segLen / 2, y + r);
    }
    ctx.lineTo(x1 + totalLen - segLen, y);
    ctx.lineTo(x2, y);
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  function drawScene(k, m, A, curPos, curVel) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const blockX = EQUILIBRIUM_X + curPos * SCALE;

    // Wall
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, CENTER_Y - 80, WALL_X, 160);
    ctx.fillStyle = '#334155';
    for (let i = -80; i < 80; i += 20) {
      ctx.beginPath();
      ctx.moveTo(WALL_X, CENTER_Y + i);
      ctx.lineTo(WALL_X - 15, CENTER_Y + i + 15);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Floor
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(WALL_X, CENTER_Y + BLOCK_H / 2, canvas.width - WALL_X, 12);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(WALL_X, CENTER_Y + BLOCK_H / 2);
    ctx.lineTo(canvas.width, CENTER_Y + BLOCK_H / 2);
    ctx.stroke();

    // Equilibrium marker
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(EQUILIBRIUM_X, CENTER_Y - 60);
    ctx.lineTo(EQUILIBRIUM_X, CENTER_Y + BLOCK_H / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#475569';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('平衡位置', EQUILIBRIUM_X, CENTER_Y - 65);
    ctx.textAlign = 'left';

    // Spring
    ctx.save();
    drawSpring(ctx, WALL_X, blockX - BLOCK_W / 2, CENTER_Y, 10, 10);
    ctx.restore();

    // Block (mass)
    const grad = ctx.createLinearGradient(blockX - BLOCK_W / 2, CENTER_Y - BLOCK_H / 2,
      blockX + BLOCK_W / 2, CENTER_Y + BLOCK_H / 2);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.fillRect(blockX - BLOCK_W / 2, CENTER_Y - BLOCK_H / 2, BLOCK_W, BLOCK_H);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(blockX - BLOCK_W / 2, CENTER_Y - BLOCK_H / 2, BLOCK_W, BLOCK_H);
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${m} kg`, blockX, CENTER_Y + 5);
    ctx.textAlign = 'left';

    // Restoring force arrow
    if (Math.abs(curPos) > 0.02) {
      const fScale = 3;
      const F = -k * curPos;
      const arrowLen = F * fScale;
      const arrowY = CENTER_Y - BLOCK_H / 2 - 10;
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.moveTo(blockX, arrowY);
      ctx.lineTo(blockX + arrowLen, arrowY);
      ctx.stroke();
      // arrowhead
      const dir = Math.sign(arrowLen);
      ctx.beginPath();
      ctx.moveTo(blockX + arrowLen, arrowY);
      ctx.lineTo(blockX + arrowLen - dir * 8, arrowY - 6);
      ctx.lineTo(blockX + arrowLen - dir * 8, arrowY + 6);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.fillStyle = '#fca5a5';
      ctx.font = '11px sans-serif';
      ctx.fillText(`F=${fmt(-k * curPos, 1)}N`, blockX + arrowLen + dir * 5, arrowY - 8);
    }

    // Position graph (mini oscilloscope)
    graphData.push(curPos);
    if (graphData.length > 300) graphData.shift();
    const graphX = 10;
    const graphY = 20;
    const graphW = canvas.width - 20;
    const graphH = 60;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(graphX, graphY, graphW, graphH);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(graphX, graphY, graphW, graphH);
    // Center line
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(graphX, graphY + graphH / 2);
    ctx.lineTo(graphX + graphW, graphY + graphH / 2);
    ctx.stroke();
    // Signal
    if (graphData.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < graphData.length; i++) {
        const gx = graphX + (i / 300) * graphW;
        const gy = graphY + graphH / 2 - (graphData[i] / A) * (graphH / 2 - 4);
        if (i === 0) ctx.moveTo(gx, gy);
        else ctx.lineTo(gx, gy);
      }
      ctx.stroke();
    }
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText('位移 x(t)', graphX + 5, graphY + 10);

    // Info
    const omega = Math.sqrt(k / m);
    const T = (2 * Math.PI) / omega;
    const Ek = 0.5 * m * curVel * curVel;
    const Ep = 0.5 * k * curPos * curPos;
    infoBox.innerHTML =
      `ω = √(k/m) = ${fmt(omega)} rad/s<br>` +
      `週期 T = ${fmt(T)} s<br>` +
      `位移 x = ${fmt(curPos)} m<br>` +
      `動能 Ek = ${fmt(Ek)} J<br>` +
      `彈性位能 Ep = ${fmt(Ep)} J`;
  }

  function resetState() {
    running = false;
    if (animId) cancelAnimationFrame(animId);
    const { A } = getParams();
    pos = A;
    vel = 0;
    graphData = [];
    playBtn.textContent = '▶ 播放';
    const { k, m } = getParams();
    drawScene(k, m, A, pos, vel);
  }

  function step() {
    const { k, m, A } = getParams();
    // RK4 integration: x'' = -(k/m)*x
    const deriv = (p, v) => ({ dp: v, dv: -(k / m) * p });
    const k1 = deriv(pos, vel);
    const k2 = deriv(pos + k1.dp * DT / 2, vel + k1.dv * DT / 2);
    const k3 = deriv(pos + k2.dp * DT / 2, vel + k2.dv * DT / 2);
    const k4 = deriv(pos + k3.dp * DT, vel + k3.dv * DT);

    pos += (DT / 6) * (k1.dp + 2 * k2.dp + 2 * k3.dp + k4.dp);
    vel += (DT / 6) * (k1.dv + 2 * k2.dv + 2 * k3.dv + k4.dv);
    drawScene(k, m, A, pos, vel);
    animId = requestAnimationFrame(step);
  }

  [kSlider, mSlider, aSlider].forEach((s) => {
    s.addEventListener('input', () => {
      kVal.textContent = kSlider.value;
      mVal.textContent = mSlider.value;
      aVal.textContent = aSlider.value;
      resetState();
    });
  });

  playBtn.addEventListener('click', () => {
    if (running) {
      running = false;
      cancelAnimationFrame(animId);
      playBtn.textContent = '▶ 播放';
    } else {
      running = true;
      playBtn.textContent = '⏸ 暫停';
      step();
    }
  });

  document.getElementById('springReset').addEventListener('click', resetState);

  resetState();
})();

/* ============================================================
   4. 均勻圓周運動 (Uniform Circular Motion)
   ============================================================ */
(function initCircular() {
  const canvas = document.getElementById('circularCanvas');
  const ctx = canvas.getContext('2d');

  const omegaSlider = document.getElementById('circOmega');
  const rSlider = document.getElementById('circR');
  const mSlider = document.getElementById('circM');
  const omegaVal = document.getElementById('circOmegaVal');
  const rVal = document.getElementById('circRVal');
  const mVal = document.getElementById('circMVal');
  const infoBox = document.getElementById('circInfo');
  const playBtn = document.getElementById('circPlay');

  let animId = null;
  let running = false;
  let angle = 0;
  const DT = 0.016;
  const CENTER_X = canvas.width / 2 - 60;
  const CENTER_Y = canvas.height / 2;
  const SCALE = 100; // px per metre

  function getParams() {
    return {
      omega: parseFloat(omegaSlider.value),
      r: parseFloat(rSlider.value),
      m: parseFloat(mSlider.value),
    };
  }

  function drawVector(fromX, fromY, toX, toY, color, label) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    const ux = dx / len;
    const uy = dy / len;
    const headLen = 10;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - ux * headLen - uy * headLen * 0.5, toY - uy * headLen + ux * headLen * 0.5);
    ctx.lineTo(toX - ux * headLen + uy * headLen * 0.5, toY - uy * headLen - ux * headLen * 0.5);
    ctx.closePath();
    ctx.fill();
    if (label) {
      ctx.fillStyle = color;
      ctx.font = '12px sans-serif';
      ctx.fillText(label, toX + 5, toY - 5);
    }
  }

  function drawScene(omega, r, m, ang) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const rPx = r * SCALE;
    const bobX = CENTER_X + Math.cos(ang) * rPx;
    const bobY = CENTER_Y + Math.sin(ang) * rPx;

    // Orbit circle
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, rPx, 0, Math.PI * 2);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Radius line
    ctx.beginPath();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.moveTo(CENTER_X, CENTER_Y);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();

    // Center point
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#94a3b8';
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('O', CENTER_X + 7, CENTER_Y - 7);

    // Particle
    const bobR = 12;
    const grad = ctx.createRadialGradient(bobX - 3, bobY - 3, 2, bobX, bobY, bobR);
    grad.addColorStop(0, '#86efac');
    grad.addColorStop(1, '#16a34a');
    ctx.beginPath();
    ctx.arc(bobX, bobY, bobR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Velocity vector (tangential, perpendicular to radius)
    const v = omega * r;
    const vScale = 30;
    const vx = -Math.sin(ang) * v * vScale;
    const vy = Math.cos(ang) * v * vScale;
    drawVector(bobX, bobY, bobX + vx, bobY + vy, '#fbbf24', `v=${fmt(v)}m/s`);

    // Centripetal acceleration vector (toward center)
    const ac = omega * omega * r;
    const acScale = 25;
    const acx = (CENTER_X - bobX) / rPx * ac * acScale;
    const acy = (CENTER_Y - bobY) / rPx * ac * acScale;
    drawVector(bobX, bobY, bobX + acx, bobY + acy, '#ef4444', `ac=${fmt(ac)}m/s²`);

    // Period / frequency graph (mini clock)
    const T = (2 * Math.PI) / omega;
    const phase = ang % (2 * Math.PI);
    const clockX = canvas.width - 90;
    const clockY = CENTER_Y;
    const clockR = 55;
    ctx.beginPath();
    ctx.arc(clockX, clockY, clockR, 0, Math.PI * 2);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Ticks
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(clockX + Math.cos(a) * (clockR - 6), clockY + Math.sin(a) * (clockR - 6));
      ctx.lineTo(clockX + Math.cos(a) * clockR, clockY + Math.sin(a) * clockR);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // Clock hand
    ctx.beginPath();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.moveTo(clockX, clockY);
    ctx.lineTo(clockX + Math.cos(ang) * (clockR - 12), clockY + Math.sin(ang) * (clockR - 12));
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`T=${fmt(T)}s`, clockX, clockY + clockR + 16);
    ctx.textAlign = 'left';

    // Info
    const Fc = m * omega * omega * r;
    const f = omega / (2 * Math.PI);
    infoBox.innerHTML =
      `線速度 v = ωr = ${fmt(v)} m/s<br>` +
      `向心加速度 ac = ω²r = ${fmt(ac)} m/s²<br>` +
      `向心力 Fc = mac = ${fmt(Fc)} N<br>` +
      `週期 T = 2π/ω = ${fmt(T)} s<br>` +
      `頻率 f = ${fmt(f, 3)} Hz`;
  }

  function resetState() {
    running = false;
    if (animId) cancelAnimationFrame(animId);
    angle = 0;
    playBtn.textContent = '▶ 播放';
    const { omega, r, m } = getParams();
    drawScene(omega, r, m, angle);
  }

  function step() {
    const { omega, r, m } = getParams();
    angle += omega * DT;
    drawScene(omega, r, m, angle);
    animId = requestAnimationFrame(step);
  }

  [omegaSlider, rSlider, mSlider].forEach((s) => {
    s.addEventListener('input', () => {
      omegaVal.textContent = omegaSlider.value;
      rVal.textContent = rSlider.value;
      mVal.textContent = mSlider.value;
      const { omega, r, m } = getParams();
      if (!running) {
        drawScene(omega, r, m, angle);
      }
      infoBox.innerHTML = `週期 T = ${fmt((2 * Math.PI) / omega)} s<br>線速度 v = ${fmt(omega * r)} m/s`;
    });
  });

  playBtn.addEventListener('click', () => {
    if (running) {
      running = false;
      cancelAnimationFrame(animId);
      playBtn.textContent = '▶ 播放';
    } else {
      running = true;
      playBtn.textContent = '⏸ 暫停';
      step();
    }
  });

  document.getElementById('circReset').addEventListener('click', resetState);

  resetState();
})();
