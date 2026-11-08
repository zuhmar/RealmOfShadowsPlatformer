"""Frame generated recipe artwork without rewriting source pixels.
Usage: python scripts/frame-recipe-art.py [generated_images_directory]
"""
from PIL import Image
from pathlib import Path
import json,shutil,runpy,sys
repo=Path(__file__).resolve().parents[1]
source_dir=Path(sys.argv[1]) if len(sys.argv)>1 else Path('/workspace/generated_images')
helpers=runpy.run_path(str(repo/'scripts/frame-class-art.py'))
bounds=helpers['silhouette_bounds'];cuts=helpers['cuts']
root=repo/'apps/web/public/assets/ui'
sets=[('recipe-scrolls','exec-8c909c42-80c7-4e5e-a768-8008ac393ed9.png',3,2,'cooking alchemy smelting tool weapon armor'),('recipe-consumables','exec-9c5f8da5-6fc6-433c-bec8-df3da66fa73f.png',5,2,'trout-skewers minnow-broth golden-carp-feast crystal-fish-roast glowfin-soup prismatic-eel-banquet greenleaf-health-potion greenleaf-mana-potion glowcap-health-potion glowcap-mana-potion'),('recipe-bars','exec-79d324f1-6a10-421d-9d8f-45db7bed6d5b.png',7,1,'iron-bar crystal-bar mire-bar frost-bar ember-bar celestial-bar shadow-bar')]
for name,source,cols,rows,names in sets:
 im=Image.open(source_dir/source).convert('RGBA');w,h=im.size
 assert im.getchannel('A').histogram()[0]/(w*h)>.15, 'Missing transparent gutters'
 frames={}
 a=im.getchannel('A');mask=a.point(lambda v:255 if v>=96 else 0)
 xs=cuts(cols,w,[sum(v>0 for v in mask.crop((x,0,x+1,h)).tobytes()) for x in range(w)])
 ys=cuts(rows,h,[sum(v>0 for v in mask.crop((0,y,w,y+1)).tobytes()) for y in range(h)])
 for i,key in enumerate(names.split()):
  x0=xs[i%cols];x1=xs[i%cols+1];y0=ys[i//cols];y1=ys[i//cols+1]
  box=bounds(a.crop((x0,y0,x1,y1)))
  x,y,r,b=box
  frames[key]={'frame':{'x':x0+x,'y':y0+y,'w':r-x,'h':b-y}}
 shutil.copyfile(source_dir/source,root/(name+'.png'))
 (root/(name+'.json')).write_text(json.dumps({'frames':frames,'meta':{'size':{'w':w,'h':h}}},indent=2)+'\n')
 print(name,im.size,im.getchannel('A').getextrema(),frames)
