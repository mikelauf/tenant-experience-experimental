import * as THREE from "three";
import type { Shell } from "@/lib/data/types";

export type Finish = NonNullable<Shell["finish"]> | "rubber";

/**
 * A floor finish drawn once into a canvas and tiled by the meter: oak planks for Sky Bar, walnut
 * herringbone for Bay Lounge, wide pale ash boards for Legacy Gallery, polished concrete for The Sandbox,
 * grass for the park, black rubber for a gym. Subtle on purpose.
 */
export function finishTexture(finish: Finish | undefined) {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  let seed = 3;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let tile = 4; // meters the canvas covers
  if (finish === "oak") {
    tile = 3.6;
    const rows = 20;
    const h = size / rows;
    for (let y = 0; y < rows; y++) {
      let x = -r() * 200;
      while (x < size) {
        const w = 120 + r() * 160;
        const l = 70 + r() * 9;
        g.fillStyle = `hsl(32 ${30 + r() * 8}% ${l}%)`;
        g.fillRect(x, y * h, w, h);
        g.fillStyle = "rgba(90,60,30,0.18)";
        g.fillRect(x, y * h, 1.5, h);
        x += w;
      }
      g.fillStyle = "rgba(90,60,30,0.16)";
      g.fillRect(0, y * h, size, 1);
    }
  } else if (finish === "walnut") {
    // Herringbone: a staircase of planks (4 × 1 units) that repeats every 8 units, turned 45° so the zigzag runs east–west
    tile = 1.4;
    const u = size / 8;
    const plank = (x: number, y: number, w: number, h: number) => {
      const l = 55 + r() * 10;
      for (const dx of [-size, 0, size])
        for (const dy of [-size, 0, size]) {
          g.fillStyle = `hsl(28 ${20 + r() * 7}% ${l}%)`;
          g.fillRect(x * u + dx, y * u + dy, w * u, h * u);
          g.fillStyle = "rgba(50,28,12,0.07)";
          for (let k = 0; k < 3; k++) {
            if (w > h) g.fillRect(x * u + dx, (y + 0.2 + k * 0.28) * u + dy, w * u, 1);
            else g.fillRect((x + 0.2 + k * 0.28) * u + dx, y * u + dy, 1, h * u);
          }
          g.strokeStyle = "rgba(45,25,10,0.22)";
          g.lineWidth = 1.5;
          g.strokeRect(x * u + dx, y * u + dy, w * u, h * u);
        }
    };
    for (let row = -3; row <= 3; row++)
      for (let n = -4; n < 12; n++) {
        plank(n + row * 4, n - row * 4, 4, 1);
        plank(n + row * 4, n + 1 - row * 4, 1, 4);
      }
  } else if (finish === "ash") {
    // Wide, long, pale boards, as a gallery floor
    tile = 6;
    const rows = 16;
    const h = size / rows;
    for (let y = 0; y < rows; y++) {
      let x = -r() * 300;
      while (x < size) {
        const w = 220 + r() * 200;
        g.fillStyle = `hsl(35 ${26 + r() * 8}% ${73 + r() * 7}%)`;
        g.fillRect(x, y * h, w, h);
        g.fillStyle = "rgba(120,90,55,0.08)";
        for (let k = 0; k < 4; k++) g.fillRect(x, y * h + 4 + r() * (h - 8), w, 1);
        g.fillStyle = "rgba(100,72,42,0.26)";
        g.fillRect(x, y * h, 1.5, h);
        x += w;
      }
      g.fillStyle = "rgba(100,72,42,0.22)";
      g.fillRect(0, y * h, size, 1.5);
    }
  } else if (finish === "concrete") {
    // Troweled concrete: soft clouding, fine aggregate, and saw cuts every three meters
    tile = 6;
    g.fillStyle = "#d1ccc3";
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 60; i++) {
      const x = r() * size;
      const y = r() * size;
      const rad = 40 + r() * 110;
      const dark = r() < 0.5;
      for (const dx of [-size, 0, size])
        for (const dy of [-size, 0, size]) {
          const grd = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
          grd.addColorStop(0, dark ? "rgba(90,80,70,0.07)" : "rgba(255,255,255,0.09)");
          grd.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = grd;
          g.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
        }
    }
    for (let i = 0; i < 16000; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "70,62,55"},${0.03 + r() * 0.05})`;
      g.fillRect(r() * size, r() * size, 1.5, 1.5);
    }
    g.fillStyle = "rgba(70,60,50,0.22)";
    for (const k of [0, size / 2]) {
      g.fillRect(k, 0, 1.5, size);
      g.fillRect(0, k, size, 1.5);
    }
  } else if (finish === "rubber") {
    // Gym rubber: near-black with pale fleck, laid in one-meter tiles
    tile = 3;
    g.fillStyle = "#34373b";
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `rgba(${r() < 0.7 ? "200,200,195" : "140,70,50"},${0.05 + r() * 0.12})`;
      g.fillRect(r() * size, r() * size, 1.5, 1.5);
    }
    g.fillStyle = "rgba(0,0,0,0.35)";
    for (let k = 0; k < 3; k++) {
      g.fillRect((k * size) / 3, 0, 1.5, size);
      g.fillRect(0, (k * size) / 3, size, 1.5);
    }
  } else if (finish === "grass") {
    tile = 6;
    g.fillStyle = "#b7c2a3";
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `hsl(${80 + r() * 20} ${18 + r() * 14}% ${55 + r() * 18}% / 0.5)`;
      g.fillRect(r() * size, r() * size, 2, 2 + r() * 3);
    }
  } else {
    tile = 2.4;
    g.fillStyle = "#e4dac8";
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 14000; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "80,70,60"},${0.02 + r() * 0.04})`;
      g.fillRect(r() * size, r() * size, 2, 2);
    }
    g.strokeStyle = "rgba(120,100,75,0.24)";
    g.lineWidth = 2;
    const n = 2;
    for (let i = 0; i <= n; i++) {
      g.beginPath();
      g.moveTo((i * size) / n, 0);
      g.lineTo((i * size) / n, size);
      g.moveTo(0, (i * size) / n);
      g.lineTo(size, (i * size) / n);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / tile, 1 / tile);
  if (finish === "walnut") t.rotation = Math.PI / 4;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

