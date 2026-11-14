import React, { useEffect, useRef, useState } from 'react';

const VERT_SRC = `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

const FRAG_SRC = `
  precision mediump float;
  varying vec2 v_uv;
  uniform sampler2D u_mask;
  uniform float u_time;
  uniform float u_energy;
  uniform vec2 u_pointer;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * noise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
    float t = u_time * (0.65 + u_energy * 0.9);
    float n1 = fbm(uv * 4.2 + vec2(t * 0.35, -t * 0.25));
    float n2 = fbm(uv * 6.5 - vec2(t * 0.28, t * 0.42));
    vec2 ripple = vec2(n1 - 0.5, n2 - 0.5) * (0.022 + u_energy * 0.028);

    vec4 maskSample = texture2D(u_mask, clamp(uv + ripple, 0.01, 0.99));
    float body = maskSample.r;
    float hot = maskSample.g;

    // Cream-and-Olive liquid metal base with specular caustic sheen
    vec3 oliveDeep = vec3(0.22, 0.23, 0.14);
    vec3 oliveMid = vec3(0.35, 0.36, 0.22);
    vec3 creamChrome = vec3(0.99, 0.98, 0.84);
    vec3 amberGold = vec3(0.85, 0.65, 0.13);

    float lightSweep = smoothstep(0.35, 0.95, sin((uv.x * 3.1 - uv.y * 2.2) + t * 1.4 + n1 * 2.4) * 0.5 + 0.5);
    float ptrDist = length(uv - u_pointer);
    float ptrGlow = exp(-ptrDist * 4.2) * 0.32;

    vec3 bg = mix(oliveDeep, oliveMid, n1 * 0.7 + lightSweep * 0.3);
    bg += creamChrome * (lightSweep * 0.14 + ptrGlow * 0.35);

    vec3 markColor = mix(creamChrome, amberGold, smoothstep(0.35, 0.75, hot));
    markColor += creamChrome * lightSweep * 0.25;

    vec3 finalCol = mix(bg, markColor, smoothstep(0.15, 0.65, body));
    // Specular rim at top edge
    float rim = smoothstep(0.16, 0.0, uv.y) * 0.18;
    finalCol += creamChrome * rim;

    gl_FragColor = vec4(finalCol, 1.0);
  }
`;

function createMaskCanvas() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  ctx.fillStyle = 'rgb(0, 0, 0)';
  ctx.fillRect(0, 0, 128, 128);

  const drawPill = (x, y, w, h, r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  };

  // 4 guardrail pickets (red channel = mask body, green channel = amber hot picket)
  drawPill(28, 36, 10, 52, 5, 'rgb(255, 0, 0)');
  drawPill(48, 32, 10, 58, 5, 'rgb(255, 0, 0)');
  drawPill(68, 24, 11, 74, 5.5, 'rgb(255, 255, 0)');
  drawPill(89, 36, 10, 52, 5, 'rgb(255, 0, 0)');

  // Horizontal rail
  ctx.strokeStyle = 'rgb(200, 0, 0)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(22, 62);
  ctx.lineTo(106, 62);
  ctx.stroke();

  // Acoustic wave
  ctx.strokeStyle = 'rgb(255, 240, 0)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(28, 92);
  ctx.bezierCurveTo(44, 80, 56, 102, 70, 90);
  ctx.bezierCurveTo(82, 80, 92, 96, 102, 86);
  ctx.stroke();

  return c;
}

export default function WhyLineLogo({ size = 'md', speaking = false, showTagline = false }) {
  const px = size === 'lg' ? 44 : size === 'sm' ? 28 : 34;
  const canvasRef = useRef(null);
  const energyRef = useRef(speaking ? 1 : 0.15);
  const pointerRef = useRef({ x: 0.5, y: 0.35 });
  const [webglReady, setWebglReady] = useState(true);

  useEffect(() => {
    energyRef.current = speaking ? 1.0 : 0.15;
  }, [speaking]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
    if (!gl) {
      setWebglReady(false);
      return undefined;
    }

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT_SRC);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) {
      setWebglReady(false);
      return undefined;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setWebglReady(false);
      return undefined;
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(prog, 'a_pos');
    const uMask = gl.getUniformLocation(prog, 'u_mask');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uEnergy = gl.getUniformLocation(prog, 'u_energy');
    const uPointer = gl.getUniformLocation(prog, 'u_pointer');

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, createMaskCanvas());

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(px * dpr);
    canvas.height = Math.round(px * dpr);

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    let visible = true;
    let raf = 0;
    const start = performance.now();

    const drawFrame = (now) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(prog);
      gl.enableVertexAttribArray(posLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(uMask, 0);
      gl.uniform1f(uTime, reducedMotion ? 0.5 : (now - start) / 1000);
      gl.uniform1f(uEnergy, energyRef.current);
      gl.uniform2f(uPointer, pointerRef.current.x, pointerRef.current.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (!reducedMotion && visible) {
        raf = requestAnimationFrame(drawFrame);
      }
    };

    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          visible = entries[0]?.isIntersecting ?? true;
          if (visible && !reducedMotion && !raf) {
            raf = requestAnimationFrame(drawFrame);
          } else if (!visible && raf) {
            cancelAnimationFrame(raf);
            raf = 0;
          }
        })
      : null;
    io?.observe(canvas);

    raf = requestAnimationFrame(drawFrame);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io?.disconnect();
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [px]);

  return (
    <span
      className={`whyline-logo whyline-logo-${size} ${speaking ? 'is-speaking' : ''}`}
      onMouseEnter={() => { energyRef.current = 0.85; }}
      onMouseLeave={() => { energyRef.current = speaking ? 1.0 : 0.15; }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          pointerRef.current = {
            x: Math.max(0, Math.min(1, (e.clientX - r.left) / px)),
            y: Math.max(0, Math.min(1, (e.clientY - r.top) / px)),
          };
        }
      }}
    >
      <span className="whyline-logo-prism" style={{ width: px, height: px }} aria-hidden="true">
        {webglReady ? (
          <canvas
            ref={canvasRef}
            className="whyline-logo-canvas"
            style={{ width: px, height: px, display: 'block' }}
          />
        ) : (
          <svg viewBox="0 0 36 36" fill="none" className="whyline-logo-svg">
            <rect x="1.5" y="1.5" width="33" height="33" rx="10" className="wl-prism-bg" />
            <path d="M3 10C3 5.5 6.5 2.5 11 2.5H25C29.5 2.5 33 5.5 33 10V13C24 16 12 16 3 13V10Z" className="wl-prism-sheen" />
            <rect x="8.5" y="10.5" width="2.6" height="14" rx="1.3" className="wl-picket wl-p1" />
            <rect x="14" y="9.5" width="2.6" height="16" rx="1.3" className="wl-picket wl-p2" />
            <rect x="19.5" y="7.5" width="2.8" height="20" rx="1.4" className="wl-picket-hot wl-p3" />
            <rect x="25" y="10.5" width="2.6" height="14" rx="1.3" className="wl-picket wl-p4" />
            <path d="M6.5 17.5H29.5" className="wl-rail" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M8.5 25.5C12.5 22.8 16 27.6 19.5 25.2C22.5 23.1 25.2 26.2 28 24.4" className="wl-wave" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <span className="whyline-wordmark-wrap">
        <span className="whyline-wordmark">
          <span className="whyline-word-why">Why</span>
          <span className="whyline-word-line">Line</span>
        </span>
        {showTagline && <span className="whyline-tagline">Spoken Fences &amp; Code Archaeology</span>}
      </span>
    </span>
  );
}
