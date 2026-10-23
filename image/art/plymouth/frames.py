#!/usr/bin/python3
"""Writes the boot splash's frames as SVG, for render.sh to turn into PNGs.

Two parts, both drawn ahead of time so every edge is smooth (Plymouth's own rotation isn't):

draw-NN.svg  the welcome draw-in from the shell (shell/qml/components/Logo.qml): the mark turns
             from -50 degrees and scales up from 0.92 while the three arcs stroke in one after
             another and the core pops in. Played once.
spin-NN.svg  a loop: a short rest, then the rings make one full turn (the middle one the other
             way, each a moment after the last), overshoot the stop and spring back into place.

One frame per 20 ms (Plymouth draws at 50 Hz).

    frames.py <out dir>
"""
import math
import os
import sys

# Orbit on a 100 grid: radius, start and end angle (degrees, 0 = up, clockwise), opacity.
ARCS = [(42, 0, 240, 1.0), (28, 68, 343, 0.6), (14, 180, 300, 1.0)]
STROKE = 7
CORE = 4.5
FPS = 50

# The spin loop, in ms: rest, then each ring's turn (starting STAGGER apart), with the middle ring
# turning the other way.
REST = 520
TURN = 1150
STAGGER = 90
DIRECTION = [1, -1, 1]


def bezier(x1, y1, x2, y2):
    """CSS cubic-bezier easing as a function of 0..1 (y may go past 1: overshoot)."""
    def at(a, b, t):
        return 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3

    def ease(x):
        if x <= 0:
            return 0.0
        if x >= 1:
            return 1.0
        lo, hi = 0.0, 1.0
        for _ in range(40):
            mid = (lo + hi) / 2
            if at(x1, x2, mid) < x:
                lo = mid
            else:
                hi = mid
        return at(y1, y2, (lo + hi) / 2)
    return ease


TURN_IN = bezier(0.16, 1, 0.3, 1)      # Logo.qml: rotation and scale, 1400 ms
STROKE_IN = bezier(0.33, 1, 0.68, 1)   # arcs (900 ms each) and core (500 ms)
SPIN = bezier(0.6, 0, 0.22, 1.32)      # picks up, overshoots the stop, settles back


def phase(ms, start, length, ease):
    return ease((ms - start) / length)


def arc_path(r, a, b):
    if b - a <= 0.01:
        return ""
    def p(deg):
        return 50 + r * math.sin(math.radians(deg)), 50 - r * math.cos(math.radians(deg))
    (x1, y1), (x2, y2) = p(a), p(b)
    large = 1 if b - a > 180 else 0
    return f"M{x1:.3f} {y1:.3f}A{r} {r} 0 {large} 1 {x2:.3f} {y2:.3f}"


def svg(body):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">'
            f'{body}</svg>\n')


def arc_el(r, a, b, opacity, turn=0.0):
    d = arc_path(r, a, b)
    if not d:
        return ""
    return (f'<path d="{d}" transform="rotate({turn:.3f} 50 50)" fill="none" stroke="#ffffff" '
            f'stroke-width="{STROKE}" stroke-linecap="round" stroke-opacity="{opacity}"/>')


def core_el(scale):
    if scale <= 0:
        return ""
    return f'<circle cx="50" cy="50" r="{CORE * scale:.3f}" fill="#ffffff" fill-opacity="{min(1, scale):.3f}"/>'


def write(out, name, body):
    with open(os.path.join(out, name), "w") as f:
        f.write(svg(body))


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)

    for i in range(1400 * FPS // 1000 + 1):
        ms = i * 1000 / FPS
        t = phase(ms, 0, 1400, TURN_IN)
        rot, scale = -50 * (1 - t), 0.92 + 0.08 * t
        parts = [arc_el(r, a, a + (b - a) * phase(ms, n * 140, 900, STROKE_IN), o) for n, (r, a, b, o) in enumerate(ARCS)]
        parts.append(core_el(phase(ms, 520, 500, STROKE_IN)))
        write(out, f"draw-{i:02d}.svg",
              f'<g transform="rotate({rot:.3f} 50 50) translate(50 50) scale({scale:.4f}) translate(-50 -50)">{"".join(parts)}</g>')

    loop = REST + TURN + STAGGER * (len(ARCS) - 1)
    for i in range(loop * FPS // 1000):
        ms = i * 1000 / FPS
        parts = []
        for n, (r, a, b, o) in enumerate(ARCS):
            turn = 360 * DIRECTION[n] * phase(ms, REST + n * STAGGER, TURN, SPIN)
            parts.append(arc_el(r, a, b, o, turn % 360 if abs(turn) >= 360 else turn))
        parts.append(core_el(1))
        write(out, f"spin-{i:02d}.svg", "".join(parts))


if __name__ == "__main__":
    main()
