"""Frame Celestial class animation sheets without rewriting source artwork.
Usage: python scripts/frame-celestial-classes.py jobs.json
jobs: [{"id":"knight-unarmed", "path":"/workspace/generated_images/...png"}, ...]
"""
from pathlib import Path
from PIL import Image
import json,runpy,statistics,shutil,sys
repo=Path(__file__).resolve().parents[1]
helpers=runpy.run_path(str(repo/'scripts/frame-class-art.py'))
root=repo/'apps/web/public/assets/characters/skins/celestial'
root.mkdir(parents=True,exist_ok=True)
weapons={'knight':'sword','archer':'bow','mage':'staff','rogue':'dual-daggers'}
manifest={'version':1,'facing':'right','columns':6,'rows':6,'sheets':{}}
for job in json.loads(Path(sys.argv[1]).read_text()):
 cls,variant=job['id'].split('-');assert cls in weapons and variant in ['armed','unarmed']
 armed=variant=='armed';names=['idle','walk','jump','attack','skill','death'] if armed else ['idle','walk','jump','climb','attack','death']
 source=Path(job['path']);im=Image.open(source).convert('RGBA');a=im.getchannel('A');w,h=im.size
 assert a.histogram()[0]/(w*h)>.15,f'{job["id"]}: missing transparent gutters'
 mask=a.point(lambda n:255 if n>=96 else 0)
 ys=helpers['cuts'](6,h,[sum(v>0 for v in mask.crop((0,y,w,y+1)).tobytes()) for y in range(h)])
 boxes=[]
 for row,name in enumerate(names):
  xs=helpers['cuts'](6,w,[sum(v>0 for v in mask.crop((x,ys[row],x+1,ys[row+1])).tobytes()) for x in range(w)])
  for col in range(6):
   cell=(xs[col],ys[row],xs[col+1],ys[row+1]);l,t,r,b=helpers['silhouette_bounds'](a.crop(cell))
   fw,fh=r-l,b-t
   foot=mask.crop((cell[0]+l,cell[1]+t+round(fh*.85),cell[0]+r,cell[1]+b)).getbbox()
   center=(foot[0]+foot[2])/2 if foot else fw/2
   boxes.append((name,col,cell[0]+l,cell[1]+t,fw,fh,center))
 vw=round(2*max(max(b[6],b[4]-b[6]) for b in boxes))+32;vh=max(b[5] for b in boxes)+32;baseline=vh-16
 frames={};anchors={}
 for name,col,x,y,fw,fh,center in boxes:
  sx=round(vw/2-center);sy=baseline-fh;key=f'{name}-{col}'
  frames[key]={'frame':{'x':x,'y':y,'w':fw,'h':fh},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':sx,'y':sy,'w':fw,'h':fh},'sourceSize':{'w':vw,'h':vh}}
  anchors[key]={'hand':{'x':sx+fw*(.9 if name in ['attack','skill'] and col in [2,3] else .78),'y':sy+fh*.63}}
 idle_h=statistics.median([b[5] for b in boxes if b[0]=='idle'])
 meta={'image':job['id']+'.png','size':{'w':w,'h':h},'sourceFrame':{'width':vw,'height':vh,'baseline':baseline,'scale':80/idle_h},'framingVersion':2,'class':cls,'variant':variant,'integratedHeadwear':True,'integratedWeapon':weapons[cls] if armed else None,'animations':{name:{'frames':[f'{name}-{n}' for n in range(6)],'frameRate':{'idle':6,'walk':10,'jump':10,'climb':8,'attack':12,'skill':12,'death':8}[name],'repeat':-1 if name in ['idle','walk','climb'] else 0} for name in names},'anchors':anchors}
 target=root/(job['id']+'.png');shutil.copyfile(source,target);target.with_suffix('.json').write_text(json.dumps({'frames':frames,'meta':meta},indent=2)+'\n')
 manifest['sheets'][job['id']]={'image':f'/assets/characters/skins/celestial/{job["id"]}.png','atlas':f'/assets/characters/skins/celestial/{job["id"]}.json','class':cls,'variant':variant,'weapon':weapons[cls] if armed else None,'source':source.name,'frames':36,'animations':names}
 print(job['id'],im.size,'rows',ys,'scale',meta['sourceFrame']['scale'])
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
