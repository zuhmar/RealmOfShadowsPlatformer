"""Remove neighboring-pose fragments through atlas cropping, preserving source PNGs.
Run after authoring character atlases. Existing virtual placement and dimensions remain intact.
"""
import json
import runpy
from pathlib import Path
from PIL import Image

scripts = Path(__file__).resolve().parent
bounds = runpy.run_path(str(scripts / 'frame-class-art.py'))['silhouette_bounds']
root = scripts.parent / 'apps/web/public/assets/characters'
for path in sorted(root.rglob('citizen-*.json')):
    if not path.with_suffix('.png').exists():
        continue
    atlas = json.loads(path.read_text())
    image = Image.open(path.with_suffix('.png')).convert('RGBA').getchannel('A')
    changed = 0
    for name, entry in atlas['frames'].items():
        f = entry['frame']
        box = (f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h'])
        x, y, right, bottom = bounds(image.crop(box), gutter=0)
        if (x, y, right, bottom) == (0, 0, f['w'], f['h']):
            continue
        f.update(x=f['x'] + x, y=f['y'] + y, w=right-x, h=bottom-y)
        trim = entry['spriteSourceSize']
        trim.update(x=trim['x']+x, y=trim['y']+y, w=f['w'], h=f['h'])
        changed += 1
    if changed:
        atlas['meta']['isolatedPoseBounds'] = True
        path.write_text(json.dumps(atlas, indent=2) + '\n')
        print(path.relative_to(root), changed, flush=True)
