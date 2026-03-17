#!/usr/bin/env python3
"""Generate Nozey app icon - a bold 'N' on a warm background."""
import subprocess
import os
import tempfile

# Create SVG icon with the "N" from Nozey branding
svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <clipPath id="roundedRect">
      <rect width="1024" height="1024" rx="220"/>
    </clipPath>
  </defs>
  <!-- Background -->
  <rect width="1024" height="1024" rx="220" fill="#d8d8d8"/>
  <!-- Grid lines clipped to rounded rect -->
  <g clip-path="url(#roundedRect)">
''' + ''.join(f'    <line x1="{x}" y1="0" x2="{x}" y2="1024" stroke="#c0c0c0" stroke-width="1.5"/>\n' for x in range(0, 1025, 32)) + ''.join(f'    <line x1="0" y1="{y}" x2="1024" y2="{y}" stroke="#c0c0c0" stroke-width="1.5"/>\n' for y in range(0, 1025, 32)) + '''  </g>
  <!-- Bold N -->
  <text x="512" y="760" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif"
        font-size="780" font-weight="900" letter-spacing="-20" fill="#1a1a1a">N</text>
</svg>'''

proj = os.path.dirname(os.path.abspath(__file__))

# Write SVG
svg_path = os.path.join(proj, 'icon.svg')
with open(svg_path, 'w') as f:
    f.write(svg_content)
print(f"Created {svg_path}")

# Use sips (built-in macOS) to convert - but sips doesn't handle SVG
# Use Python to create a PNG via subprocess with qlmanage or use the built-in
# macOS tool: /usr/bin/qlmanage or just use sips with a rasterized approach.

# Actually, let's use the macOS built-in tool to convert SVG to PNG
# Try using /usr/bin/python3 with CoreGraphics

convert_script = '''
import Cocoa
import AppKit
import os
import sys

proj = sys.argv[1]
svg_path = os.path.join(proj, 'icon.svg')

# Load SVG as NSImage
svg_data = open(svg_path, 'rb').read()
ns_data = Cocoa.NSData.dataWithBytes_length_(svg_data, len(svg_data))
image = AppKit.NSImage.alloc().initWithData_(ns_data)

if image is None:
    print("Failed to load SVG")
    sys.exit(1)

sizes = [16, 32, 64, 128, 256, 512, 1024]

# Create iconset directory
iconset_path = os.path.join(proj, 'icon.iconset')
os.makedirs(iconset_path, exist_ok=True)

for size in sizes:
    for scale in [1, 2]:
        px = size * scale
        if px > 1024:
            continue

        # Create bitmap
        rep = AppKit.NSBitmapImageRep.alloc().initWithBitmapDataPlanes_pixelsWide_pixelsHigh_bitsPerSample_samplesPerPixel_hasAlpha_isPlanar_colorSpaceName_bytesPerRow_bitsPerPixel_(
            None, px, px, 8, 4, True, False,
            AppKit.NSCalibratedRGBColorSpace, 0, 0
        )

        context = AppKit.NSGraphicsContext.graphicsContextWithBitmapImageRep_(rep)
        AppKit.NSGraphicsContext.setCurrentContext_(context)

        # Draw image
        image.drawInRect_fromRect_operation_fraction_(
            Cocoa.NSMakeRect(0, 0, px, px),
            Cocoa.NSZeroRect,
            AppKit.NSCompositingOperationSourceOver,
            1.0
        )

        context.flushGraphics()

        # Save PNG
        if scale == 1:
            name = f"icon_{size}x{size}.png"
        else:
            name = f"icon_{size}x{size}@2x.png"

        png_data = rep.representationUsingType_properties_(AppKit.NSBitmapImageRepFileTypePNG, {})
        png_data.writeToFile_atomically_(os.path.join(iconset_path, name), True)
        print(f"  Created {name} ({px}x{px})")

print("Iconset created")
'''

script_path = os.path.join(tempfile.gettempdir(), 'gen_iconset.py')
with open(script_path, 'w') as f:
    f.write(convert_script)

print("Generating iconset PNGs...")
result = subprocess.run(['/usr/bin/python3', script_path, proj], capture_output=True, text=True)
print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr)

if result.returncode != 0:
    print(f"Failed with code {result.returncode}")
    sys.exit(1)

# Convert iconset to icns
iconset_path = os.path.join(proj, 'icon.iconset')
icns_path = os.path.join(proj, 'icon.icns')
print("Converting to .icns...")
result = subprocess.run(['iconutil', '-c', 'icns', iconset_path, '-o', icns_path],
                       capture_output=True, text=True)
if result.returncode == 0:
    print(f"Created {icns_path}")
else:
    print(f"iconutil failed: {result.stderr}")
