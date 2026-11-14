# usage: python3 scripts/make-icon.py public/apple-touch-icon.png  (delete the old PNG first)
# Renders public/icon.svg's design to a 180x180 opaque PNG (apple-touch-icon), 4x supersampled.
import math, struct, zlib, sys
SIZE, SS = 180, 4
BG, FG = (0x16, 0xA3, 0x4A), (255, 255, 255)
C, HALF_W = 256.0, 14.0          # SVG units (512 canvas): center, half stroke width
RADII = (113.0, 181.0)
SPANS = ((135.0, 225.0), (-45.0, 45.0))  # left / right arcs (degrees, y-down)

def in_arc(x, y):
	dx, dy = x - C, y - C
	r = math.hypot(dx, dy)
	a = math.degrees(math.atan2(dy, dx))
	for R in RADII:
		for lo, hi in SPANS:
			aa = a if lo >= 0 or a <= 180 else a
			if lo < 0 and a > 180: aa = a - 360
			if lo >= 0 and a < 0: aa = a + 360
			if lo <= aa <= hi:
				if abs(r - R) <= HALF_W: return True
			else:
				for e in (lo, hi):
					ex, ey = C + R * math.cos(math.radians(e)), C + R * math.sin(math.radians(e))
					if math.hypot(x - ex, y - ey) <= HALF_W: return True
	return False

def covered(x, y):
	return math.hypot(x - C, y - C) <= 40.0 or in_arc(x, y)

rows = bytearray()
scale = 512.0 / SIZE
for py in range(SIZE):
	rows.append(0)
	for px in range(SIZE):
		hits = 0
		for sy in range(SS):
			for sx in range(SS):
				x = (px + (sx + 0.5) / SS) * scale
				y = (py + (sy + 0.5) / SS) * scale
				hits += covered(x, y)
		f = hits / (SS * SS)
		rows.extend(round(BG[i] + (FG[i] - BG[i]) * f) for i in range(3))

def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", SIZE, SIZE, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(bytes(rows), 9)) + chunk(b"IEND", b"")
open(sys.argv[1], "xb").write(png)
print("wrote", sys.argv[1], len(png), "bytes")
