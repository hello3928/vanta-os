#!/bin/bash
# Renders the boot splash frames (image/art/plymouth) and writes build/splash-preview.html, which
# plays them as Plymouth does: the draw-in once, then the spin loop, at 50 frames a second.
set -e
ROOT=/mnt/c/Users/Thomas/Documents/VantaOS
T=$(mktemp -d)
python3 "$ROOT/image/art/plymouth/frames.py" "$T/svg"
mkdir -p "$T/png"
for f in "$T"/svg/*.svg; do rsvg-convert -w 384 -h 384 "$f" -o "$T/png/$(basename "${f%.svg}").png"; done
python3 - "$T/png" "$ROOT/build/splash-preview.html" "${1:-}" <<'EOF'
import base64, os, sys
src, out, msg = sys.argv[1], sys.argv[2], sys.argv[3]
def frames(prefix):
    names = sorted(n for n in os.listdir(src) if n.startswith(prefix + "-"))
    return ["data:image/png;base64," + base64.b64encode(open(os.path.join(src, n), "rb").read()).decode() for n in names]
draw, spin = frames("draw"), frames("spin")
html = f"""<!doctype html><meta charset="utf-8"><title>Boot splash preview</title>
<style>html,body{{margin:0;height:100%;background:#000;overflow:hidden}}
img{{position:absolute;left:50%;top:50%;width:16.5vmin;height:16.5vmin;transform:translate(-50%,-50%)}}
p{{position:absolute;left:0;right:0;top:calc(50% + 8.25vmin + 6.9vmin);margin:0;text-align:center;
color:#ccd1db;font:500 max(11px,1.85vh) Figtree,system-ui,sans-serif}}</style>
<img id="f"><p id="m"></p>
<script>
const draw={draw!r}, spin={spin!r};
const pre=[...draw,...spin].map(s=>{{const i=new Image();i.src=s;return i}});
document.getElementById('m').textContent={msg!r};
let n=0;const el=document.getElementById('f');
setInterval(()=>{{el.src=n<draw.length?draw[n]:spin[(n-draw.length)%spin.length];n++;}},20);
</script>"""
open(out, "w").write(html)
print(out, len(draw), "draw frames,", len(spin), "spin frames")
EOF
rm -rf "$T"
