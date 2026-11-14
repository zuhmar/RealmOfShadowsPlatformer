"""Inspect generated Frostfall art and write atlas metadata; preserve PNG pixels unchanged."""
from pathlib import Path
from PIL import Image
from scipy.ndimage import label,find_objects
import numpy as np,json,shutil,sys
root=Path(__file__).resolve().parents[1]/'apps/web/public/assets'
jobs=json.loads(Path(sys.argv[1]).read_text())
def atlas(source,target,cols,rows,names,virtual=False):
 im=Image.open(source).convert('RGBA');W,H=im.size;arr=np.asarray(im);frames={};bounds=[]
 for i,name in enumerate(names):
  x0=round(i%cols*W/cols);x1=round((i%cols+1)*W/cols);y0=round(i//cols*H/rows);y1=round((i//cols+1)*H/rows);a=arr[y0:y1,x0:x1,3]
  lab,n=label(a>=110);counts=np.bincount(lab.ravel());counts[0]=0;idx=int(counts.argmax());assert counts[idx]>10,(target,name)
  sy,sx=find_objects(lab)[idx-1]
  # Effects may consist of several large separated spikes; use the complete authored cell silhouette.
  if 'slam' in str(target):
   yy,xx=np.where(a>=80);sy=slice(int(yy.min()),int(yy.max())+1);sx=slice(int(xx.min()),int(xx.max())+1)
  l=max(0,sx.start-2);r=min(x1-x0,sx.stop+2);t=max(0,sy.start-2);b=min(y1-y0,sy.stop+2)
  entry={'frame':{'x':x0+l,'y':y0+t,'w':r-l,'h':b-t}}
  if virtual:
   cw=round(W/cols);ch=round(H/rows);baseline=round(ch*.92)
   entry.update(rotated=False,trimmed=True,spriteSourceSize={'x':l,'y':baseline-(b-t),'w':r-l,'h':b-t},sourceSize={'w':cw,'h':ch})
  frames[name]=entry;bounds.append((r-l,b-t))
 meta={'image':target.name+'.png','size':{'w':W,'h':H},'source':Path(source).name}
 target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target.with_suffix('.png'))
 data={'frames':frames,'meta':meta};return data,bounds
for j in jobs:
 key,source=j['key'],j['path']
 if j['type']=='background':
  shutil.copy2(source,root/'backgrounds'/f'{key}.png');continue
 if j['type']=='monster':
  target=root/'monsters'/key;names=[f'{a}-{i}' for a in ['idle','walk','attack','death'] for i in range(4)];data,bounds=atlas(source,target,4,4,names,True);cellH=round(data['meta']['size']['h']/4)
  height={'frost-wolf':66,'ice-troll':95,'frozen-wraith':85,'frost-giant':125}[key];scale=height/float(np.median([h for w,h in bounds[:4]]))
  clips={'origins':[{'x':.5,'y':.92} for _ in names],'height':height,'scale':scale,'animations':{a:{'frames':[f'{a}-{i}' for i in range(4)],'frameRate':8 if a in ['walk','attack'] else 4 if a=='idle' else 6,'repeat':-1 if a in ['idle','walk'] else 0} for a in ['idle','walk','attack','death']}}
  target.with_name(key+'-clips.json').write_text(json.dumps(clips,indent=2)+'\n')
 elif j['type']=='platform':
  target=root/'tilesets'/key;data,bounds=atlas(source,target,1,4,['ground','long','medium','short']);w,h=bounds[0];data['meta']['ground']={'worldHeight':90,'repeatStart':round(w*.3),'repeatEnd':round(w*.7),'fill':{'x':round(w*.5),'y':h-5,'w':1,'h':1}}
 elif j['type']=='props':target=root/'tilesets'/key;data,bounds=atlas(source,target,3,2,['ore','tree','herbs','boulder','lantern','runestone'])
 elif j['type']=='traversal':
  target=root/'tilesets/traversal/frostfall';data,bounds=atlas(source,target,2,1,['ladder','pond']);lw,lh=bounds[0]
  # The generated dock crosses the canvas midpoint: inspect the whole right-hand silhouette.
  sourceArr=np.asarray(Image.open(source).convert('RGBA'));offset=round(sourceArr.shape[1]*.24);mask=sourceArr[:,offset:,3]>=110;labs,n=label(mask);counts=np.bincount(labs.ravel());counts[0]=0;sy,sx=find_objects(labs)[int(counts.argmax())-1];px=offset+sx.start-2;py=sy.start-2;pw=sx.stop-sx.start+4;ph=sy.stop-sy.start+4
  data['frames']['pond']={'frame':{'x':px,'y':py,'w':pw,'h':ph}}
  f=data['frames']['ladder']['frame'];im=np.asarray(Image.open(source).convert('RGBA'));a=im[f['y']:f['y']+f['h'],f['x']:f['x']+f['w'],3];center=a[:,round(lw*.35):round(lw*.65)].mean(axis=1);occupied=center>150
  runs=[];start=None
  for y,v in enumerate(occupied):
   if v and start is None:start=y
   if start is not None and (not v or y==lh-1):
    end=y if not v else y+1
    if end-start>3:runs.append((start,end))
    start=None
  rungs=[r for r in runs if lh*.12<sum(r)/2<lh*.88];assert len(rungs)>=4,rungs
  a0,b0=rungs[len(rungs)//2];prev=rungs[len(rungs)//2-1]
  rail=max(1,prev[1]+3);railH=max(2,min(6,a0-rail-1))
  data['meta']['ladder']={'topCap':rungs[0][1]+3,'bottomCapStart':rungs[-1][0]-3,'railStart':rail,'railHeight':railH,'rungStart':a0-2,'rungHeight':b0-a0+4,'repeat':round((a0+b0-prev[0]-prev[1])/2)}
  data['meta']['pond']={'walkSurface':90,'waterSurface':125,'castX':.72,'standX':.26}
 elif j['type']=='items':target=root/'ui/frostfall-items';data,bounds=atlas(source,target,4,4,['frost-ore','frostpine','frostleaf','icefin','frost-salmon','glacier-pike','frost-pelt','troll-tusk','wraith-essence','giant-heart','frostfall-boss-key','frost-giant-trophy','icefin-roast','frost-salmon-stew','glacier-pike-feast','frostleaf-health-potion'])
 elif j['type']=='npc':target=root/'characters/frostwarden';data,bounds=atlas(source,target,1,1,['idle'])
 elif j['type']=='effect':target=root/'effects/frost-giant-slam';data,bounds=atlas(source,target,4,2,[f'fx-{i}' for i in range(8)],True)
 else:
  shutil.copy2(source,root/'props'/f'{key}.png');continue
 target.with_suffix('.json').write_text(json.dumps(data,indent=2)+'\n');print(key,flush=True)
extra=Path('/workspace/generated_images/exec-6ea69892-58d8-40e9-bd65-8d4035824486.png');target=root/'ui/frostfall-extras';data,_=atlas(extra,target,2,2,['frostleaf-mana-potion','frost-bar','frost-sigil','frost-chest']);target.with_suffix('.json').write_text(json.dumps(data,indent=2)+'\n')
