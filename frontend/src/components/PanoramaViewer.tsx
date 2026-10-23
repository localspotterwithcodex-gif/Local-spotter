"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useLocale } from "@/i18n/LocaleContext";

const VERTEX = `attribute vec2 p; varying vec2 v; void main(){ v = p; gl_Position = vec4(p, 0.0, 1.0); }`;
// Ray-casts every pixel into the equirectangular image: no geometry, no dependencies.
const FRAGMENT = `precision highp float;
varying vec2 v; uniform sampler2D tex; uniform float yaw; uniform float pitch; uniform float fov; uniform float aspect;
const float PI = 3.14159265;
void main(){
  float t = tan(fov * 0.5);
  vec3 d = normalize(vec3(v.x * t * aspect, v.y * t, -1.0));
  float cp = cos(pitch), sp = sin(pitch);
  d = vec3(d.x, d.y * cp + d.z * sp, -d.y * sp + d.z * cp);
  float cy = cos(yaw), sy = sin(yaw);
  d = vec3(d.x * cy + d.z * sy, d.y, -d.x * sy + d.z * cy);
  float lon = atan(d.x, -d.z);
  float lat = asin(clamp(d.y, -1.0, 1.0));
  gl_FragColor = texture2D(tex, vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI));
}`;

const MIN_FOV = (30 * Math.PI) / 180;
const MAX_FOV = (100 * Math.PI) / 180;
const MAX_PITCH = (85 * Math.PI) / 180;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type);
  if (!s) throw new Error("shader");
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("shader compile");
  return s;
}

/**
 * Drag-to-look 360° viewer for an equirectangular (2:1) photo. Plain WebGL, no library.
 * Mouse/touch drag, wheel and pinch zoom, arrow keys. Falls back to a message when WebGL or the image is unavailable.
 */
export function PanoramaViewer({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const { t } = useLocale();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef({ yaw: 0, pitch: 0, fov: (75 * Math.PI) / 180 });
  const redraw = useRef<() => void>(() => undefined);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [full, setFull] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) {
      setState("error");
      return;
    }
    let disposed = false;
    let program: WebGLProgram | null = null;
    let texture: WebGLTexture | null = null;

    const draw = () => {
      if (!program || disposed) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      const u = (n: string) => gl.getUniformLocation(program!, n);
      gl.uniform1f(u("yaw"), view.current.yaw);
      gl.uniform1f(u("pitch"), view.current.pitch);
      gl.uniform1f(u("fov"), view.current.fov);
      gl.uniform1f(u("aspect"), w / h);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    redraw.current = () => requestAnimationFrame(draw);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (disposed) return;
      try {
        const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
        let source: TexImageSource = img;
        if (img.width > max) {
          // Downscale for GPUs with small texture limits.
          const c = document.createElement("canvas");
          c.width = max;
          c.height = Math.round((img.height * max) / img.width);
          c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
          source = c;
        }
        const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
        program = gl.createProgram();
        if (!program) throw new Error("program");
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("link");
        gl.useProgram(program);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(program, "p");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        // Non-power-of-two textures need CLAMP; longitude wraps in the shader.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        setState("ready");
        draw();
      } catch {
        setState("error");
      }
    };
    img.onerror = () => !disposed && setState("error");
    img.src = src;

    const onResize = () => redraw.current();
    window.addEventListener("resize", onResize);
    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      if (texture) gl.deleteTexture(texture);
      if (program) gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [src]);

  // Pointer interaction: one pointer drags, two pointers pinch.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef(0);

  const clampView = () => {
    const v = view.current;
    v.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, v.pitch));
    v.fov = Math.max(MIN_FOV, Math.min(MAX_FOV, v.fov));
    redraw.current();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current > 0) view.current.fov *= pinch.current / dist;
      pinch.current = dist;
    } else {
      const h = (e.currentTarget as HTMLElement).clientHeight || 1;
      const k = view.current.fov / h; // radians per pixel
      view.current.yaw -= (e.clientX - prev.x) * k;
      view.current.pitch += (e.clientY - prev.y) * k;
    }
    clampView();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    pinch.current = 0;
  };
  const onWheel = (e: React.WheelEvent) => {
    view.current.fov *= e.deltaY > 0 ? 1.06 : 0.94;
    clampView();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 0.08;
    const v = view.current;
    if (e.key === "ArrowLeft") v.yaw -= step;
    else if (e.key === "ArrowRight") v.yaw += step;
    else if (e.key === "ArrowUp") v.pitch += step;
    else if (e.key === "ArrowDown") v.pitch -= step;
    else if (e.key === "+" || e.key === "=") v.fov *= 0.92;
    else if (e.key === "-") v.fov *= 1.08;
    else return;
    e.preventDefault();
    clampView();
  };

  const toggleFull = useCallback(async () => {
    const el = wrapRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      /* fullscreen not available */
    }
  }, []);
  useEffect(() => {
    const onChange = () => {
      setFull(!!document.fullscreenElement);
      redraw.current();
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  return (
    <div ref={wrapRef} className={`relative w-full ${className ?? "aspect-[16/10] md:aspect-[2/1]"} bg-[#111111] rounded-2xl overflow-hidden`}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={alt}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        className="w-full h-full touch-none cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FA1EFF]"
      />
      {state === "loading" && <p className="absolute inset-0 flex items-center justify-center text-xs text-white/80">{t("panorama.loading")}</p>}
      {state === "error" && <p role="alert" className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-white/80">{t("panorama.error")}</p>}
      {state === "ready" && (
        <>
          <p className="absolute left-3 bottom-3 text-[11px] text-white/80 bg-black/40 rounded-full px-2.5 py-1 pointer-events-none">{t("panorama.hint")}</p>
          <button
            type="button"
            onClick={() => void toggleFull()}
            aria-label={full ? t("panorama.exitFullscreen") : t("panorama.fullscreen")}
            className="absolute right-3 bottom-3 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center"
          >
            {full ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </>
      )}
    </div>
  );
}
