"""Create lossless, content-addressed WebP delivery copies; retain source PNGs."""
from pathlib import Path
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,sys
root=Path(__file__).resolve().parents[1]/'apps/web/public'
output=root/'assets/optimized';output.mkdir(exist_ok=True)
manifest_path=root/'assets/optimized-manifest.json'
previous=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
def convert(path):
    original=path.read_bytes()
    digest=hashlib.sha256(original+b'lossless-webp-v1').hexdigest()[:20]
    target=output/(digest+'.webp')
    if not target.exists():
        with Image.open(path) as image:
            image.save(target,'WEBP',lossless=True,exact=True,method=4)
    size=target.stat().st_size
    if size>=len(original)*.95:
        target.unlink(missing_ok=True);return None
    return ('/'+path.relative_to(root).as_posix(),'/'+target.relative_to(root).as_posix(),len(original),size)
paths=sorted((root/'assets').rglob('*.png'))
with ThreadPoolExecutor(max_workers=4) as pool:rows=[r for r in pool.map(convert,paths) if r]
manifest={r[0]:r[1] for r in rows}
if '--verify' in sys.argv:
    for original,delivery in manifest.items():
        with Image.open(root/original.lstrip('/')) as a, Image.open(root/delivery.lstrip('/')) as b:
            assert a.size == b.size and a.convert('RGBA').tobytes() == b.convert('RGBA').tobytes(),original
    print(f'Verified {len(manifest)} lossless copies.')
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
css_path=root.parent/'src/style.css'
css=css_path.read_text()
for original,old_delivery in previous.items(): css=css.replace(old_delivery,original)
for original,delivery in manifest.items(): css=css.replace(original,delivery)
css_path.write_text(css)
report={'images':len(rows),'originalBytes':sum(r[2] for r in rows),'deliveryBytes':sum(r[3] for r in rows),'encoding':'lossless WebP; original dimensions and RGBA pixels retained'}
print(json.dumps(report,indent=2))
(root/'assets/optimized-report.json').write_text(json.dumps(report,indent=2)+'\n')
