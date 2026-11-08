"""Build atlas metadata for the generated 6x6 test character; preserve source pixels."""
from pathlib import Path
from PIL import Image
import runpy,json,shutil,statistics,sys
repo=Path(__file__).resolve().parents[1]
helpers=runpy.run_path(str(repo/'scripts/frame-class-art.py'))
source=Path(sys.argv[1]) if len(sys.argv)>1 else Path('/workspace/generated_images/exec-e28e2ef8-5547-4999-ac18-478376c7387a.png')
im=Image.open(source).convert('RGBA');a=im.getchannel('A');w,h=im.size
assert a.histogram()[0]/(w*h)>.2
names=['idle','walk','jump','climb','attack','death'];frames={};anchors={};heights=[]
# Fixed cells isolate authored actions; component bounds exclude detached gutter noise.
boxes=[]
for row,name in enumerate(names):
 for col in range(6):
  cell=(round(col*w/6),round(row*h/6),round((col+1)*w/6),round((row+1)*h/6))
  x,y,r,b=helpers['silhouette_bounds'](a.crop(cell))
  boxes.append((name,col,cell[0]+x,cell[1]+y,r-x,b-y))
vw=max(b[4] for b in boxes)+32;vh=max(b[5] for b in boxes)+32;baseline=vh-16
for name,col,x,y,fw,fh in boxes:
 key=f'{name}-{col}';sx=round((vw-fw)/2);sy=baseline-fh
 frames[key]={'frame':{'x':x,'y':y,'w':fw,'h':fh},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':sx,'y':sy,'w':fw,'h':fh},'sourceSize':{'w':vw,'h':vh}}
 anchors[key]={'hand':{'x':sx+fw*(.9 if name=='attack' and col in [2,3] else .78),'y':sy+fh*.63}}
 if name=='idle':heights.append(fh)
stem=sys.argv[2] if len(sys.argv)>2 else 'golden-test'
meta={'image':stem+'.png','size':{'w':w,'h':h},'sourceFrame':{'width':vw,'height':vh,'baseline':baseline,'scale':80/statistics.median(heights)},'framingVersion':2,'integratedHeadwear':True,'integratedWeapon':None,'animations':{name:{'frames':[f'{name}-{n}' for n in range(6)],'frameRate':{'idle':6,'walk':10,'jump':10,'climb':8,'attack':12,'death':8}[name],'repeat':-1 if name in ['idle','walk','climb'] else 0} for name in names},'anchors':anchors}
target=repo/'apps/web/public/assets/characters/skins'/f'{stem}.png';shutil.copyfile(source,target);target.with_suffix('.json').write_text(json.dumps({'frames':frames,'meta':meta},indent=2)+'\n')
print('Framed',len(frames),'poses',im.size,'scale',meta['sourceFrame']['scale'])
