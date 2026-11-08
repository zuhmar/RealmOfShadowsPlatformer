"""Create content-addressed WebP delivery copies; retain source artwork and exact alpha."""
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
    # UI lettering/icons keep exact color; larger world and animation art uses quality 88.
    lossless='/ui/' in path.as_posix()
    profile=b'lossless-webp-v1' if lossless else b'webp-q88-alpha100-v1'
    digest=hashlib.sha256(original+profile).hexdigest()[:20]
    target=output/(digest+'.webp')
    if not target.exists():
        with Image.open(path) as image:
            image.save(target,'WEBP',lossless=lossless,quality=88,alpha_quality=100,exact=True,method=4)
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
            assert a.size == b.size,original
            assert a.convert('RGBA').getchannel('A').tobytes() == b.convert('RGBA').getchannel('A').tobytes(),original
            if '/ui/' in original:
                assert a.convert('RGBA').tobytes() == b.convert('RGBA').tobytes(),original
    print(f'Verified {len(manifest)} copies: identical dimensions and alpha; UI RGBA remains lossless.')
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
css_path=root.parent/'src/style.css'
css=css_path.read_text()
for original,old_delivery in previous.items(): css=css.replace(old_delivery,original)
for original,delivery in manifest.items(): css=css.replace(original,delivery)
css_path.write_text(css)
report={'images':len(rows),'originalBytes':sum(r[2] for r in rows),'deliveryBytes':sum(r[3] for r in rows),'encoding':'WebP quality 88, exact alpha and original dimensions; UI remains lossless'}
print(json.dumps(report,indent=2))
(root/'assets/optimized-report.json').write_text(json.dumps(report,indent=2)+'\n')
