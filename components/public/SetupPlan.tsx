import type { Rect, Setup, SetupSpec, Shell } from "@/lib/data/types";
import { shellBounds } from "@/lib/setup/shell";
import { makeLayout } from "@/components/three/setup/layouts";

/*
 * No "use client": the brief draws its plans on the server, and The space uses the same drawing as its poster,
 * so pages that only need a plan don't pull in the 3D viewer's code.
 */

/** Top-down plan, drawn from the same shell and layout. The poster while 3D loads, and the reduced-motion view. */
export function Plan({ shell, spec, setup, guests }: { shell: Shell; spec: SetupSpec; setup: Setup; guests: number }) {
  const L = makeLayout(setup, guests, shell, spec);
  const b = shellBounds(shell);
  const f = shell.fixed ?? {};
  const pad = 1;
  const rect = (r: Rect, fill: string, key: string) => <rect key={key} x={r.x - r.w / 2} y={r.z - r.d / 2} width={r.w} height={r.d} fill={fill} />;
  return (
    <svg viewBox={`${b.x0 - pad} ${b.z0 - pad} ${b.w + pad * 2} ${b.d + pad * 2}`} className="h-full w-full">
      <polygon points={shell.outline.map((p) => p.join(",")).join(" ")} fill={shell.outdoor ? "#d6d9cd" : "#ebe4d8"} stroke="#cfccc4" strokeWidth={0.12} />
      {shell.solids.map((r, i) => rect(r, "#d9d3c8", `s${i}`))}
      {(shell.context ?? []).map((r, i) => rect(r, "#e4e1da", `c${i}`))}
      {(f.marks ?? []).map((r, i) => rect(r, "#ddd4c5", `m${i}`))}
      {(shell.rooms ?? []).map((r, i) => (
        <rect key={`r${i}`} x={r.x - r.w / 2} y={r.z - r.d / 2} width={r.w} height={r.d} fill="none" stroke="#cfccc4" strokeWidth={0.12} />
      ))}
      {f.stage && (f.stage.always || L.stage) && rect(f.stage, "#d8d1c4", "stage")}
      {(f.bars ?? []).filter((r) => r.always || L.bar).map((r, i) => rect(r, "#6f4a2f", `b${i}`))}
      {f.screen && <line x1={f.screen[0]} y1={f.screen[1]} x2={f.screen[2]} y2={f.screen[3]} stroke="#2a2d30" strokeWidth={0.14} />}
      {(f.trees ?? []).map(([x, z], i) => (
        <circle key={`t${i}`} cx={x} cy={z} r={1.1} fill="#33443a" opacity={0.85} />
      ))}
      {L.rounds.map(([x, z, s], i) => (
        <circle key={`r${i}`} cx={x} cy={z} r={0.62 * (s || 1)} fill="#6f4a2f" />
      ))}
      {L.longs.map(([x, z, len], i) => (
        <rect key={`l${i}`} x={x - len / 2} y={z - 0.31} width={len} height={0.62} fill="#6f4a2f" />
      ))}
      {L.highs.map(([x, z], i) => (
        <circle key={`h${i}`} cx={x} cy={z} r={0.3} fill="#6f4a2f" />
      ))}
      {L.sofas.map(([x, z, rot], i) => (
        <rect key={`so${i}`} x={x - 0.95} y={z - 0.4} width={1.9} height={0.8} rx={0.2} fill="#d9cfbf" transform={`rotate(${(-rot * 180) / Math.PI} ${x} ${z})`} />
      ))}
      {L.chairs.map(([x, z, rot], i) => (
        <rect key={`ch${i}`} x={x - 0.21} y={z - 0.2} width={0.42} height={0.4} rx={0.08} fill="#3b3f43" transform={`rotate(${(-rot * 180) / Math.PI} ${x} ${z})`} />
      ))}
      {L.people.map(([x, z], i) => (
        <circle key={`p${i}`} cx={x} cy={z} r={L.per > 1 ? 0.24 : 0.18} fill={i % 3 ? "#62666a" : "var(--color-accent)"} />
      ))}
    </svg>
  );
}
