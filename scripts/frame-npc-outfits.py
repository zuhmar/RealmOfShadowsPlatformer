"""Create outfit atlas metadata while preserving the approved source artwork."""
from pathlib import Path
from PIL import Image
import json,shutil,runpy,sys
repo=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]) if len(sys.argv)>1 else Path('/workspace/generated_images/exec-8ea6c3b1-1888-4e64-b86f-e8a9f90bfcc0.png')
im=Image.open(source).convert('RGBA');alpha=im.getchannel('A');w,h=im.size
bounds=runpy.run_path(str(repo/'scripts/frame-class-art.py'))['silhouette_bounds']
frames={}
for i,name in enumerate(['mira','bram','mentor']):
 left=round(i*w/3);right=round((i+1)*w/3)
 x,y,r,b=bounds(alpha.crop((left,0,right,h)))
 frames[name]={'frame':{'x':left+x,'y':y,'w':r-x,'h':b-y}}
root=repo/'apps/web/public/assets/characters/skins'
shutil.copyfile(source,root/'npc-outfits.png')
(root/'npc-outfits.json').write_text(json.dumps({'frames':frames,'meta':{'image':'npc-outfits.png','size':{'w':w,'h':h}}},indent=2)+'\n')
print(frames)
