"""Frame generated character-and-tool gathering sheets using metadata only.
Usage: python scripts/frame-baked-gathering.py /tmp/baked-gathering-jobs.json
Each job supplies skin, material, path. Source PNG pixels are retained unchanged.
"""
from pathlib import Path
from PIL import Image
from scipy.ndimage import label,find_objects
import numpy as np,json,shutil,sys,statistics
root=Path(__file__).resolve().parents[1]
output=root/'apps/web/public/assets/characters/gathering/baked';output.mkdir(parents=True,exist_ok=True)
jobs=json.loads(Path(sys.argv[1]).read_text());activities=['mining','woodcutting','fishing','herbalism'];kinds=['pickaxe','axe','rod','sickle']
for job in jobs:
 skin,material=job['skin'],job['material'];src=Path(job['path']);im=Image.open(src).convert('RGBA');arr=np.asarray(im);H,W=arr.shape[:2]
 reference=json.loads((output.parent/'skins'/f'{skin}.json').read_text());refW=reference['meta']['size']['w'];refH=reference['meta']['size']['h'];frames={};anchors={};baseline=520;virtualW=640;virtualH=600
 for i in range(16):
  activity=activities[i//4];name=f'{activity}-{i%4}';x0=round(i%4*W/4);x1=round((i%4+1)*W/4);y0=round(i//4*H/4);y1=round((i//4+1)*H/4);cell=arr[y0:y1,x0:x1];a=cell[:,:,3];lab,n=label(a>=160);counts=np.bincount(lab.ravel());counts[0]=0;idx=int(counts.argmax());ys,xs=find_objects(lab)[idx-1];mask=lab==idx
  l=max(0,xs.start-2);r=min(cell.shape[1],xs.stop+2);t=max(0,ys.start-2);b=min(cell.shape[0],ys.stop+2)
  # Infer boot location from the matching reference pose, keeping below-foot tool tips intact.
  ref=reference['frames'][name];rf=ref['frame'];rp=ref['spriteSourceSize'];footRefX=rf['x']+reference['meta']['sourceFrame']['width']/2-rp['x'];footRefY=rf['y']+reference['meta']['sourceFrame']['baseline']-rp['y']
  ex=(footRefX-(i%4)*refW/4)/(refW/4)*cell.shape[1];ey=(footRefY-(i//4)*refH/4)/(refH/4)*cell.shape[0]
  xa=max(l,round(ex-cell.shape[1]*.17));xb=min(r,round(ex+cell.shape[1]*.17));ya=max(t,round(ey-cell.shape[0]*.15));yb=min(b,round(ey+cell.shape[0]*.07))
  yy,xx=np.where(mask[ya:yb,xa:xb]);assert len(xx),(skin,material,name,'no boots');footY=ya+int(yy.max())+1
  footStrip=mask[max(ya,footY-10):footY,xa:xb];fx=np.where(footStrip)[1];footX=xa+float(fx.min()+fx.max())/2
  left=round(virtualW/2-(footX-l));top=round(baseline-(footY-t));assert left>=0 and top>=0 and left+r-l<=virtualW and top+b-t<=virtualH,(skin,material,name,'virtual bounds')
  frames[name]={'frame':{'x':x0+l,'y':y0+t,'w':r-l,'h':b-t},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':left,'y':top,'w':r-l,'h':b-t},'sourceSize':{'w':virtualW,'h':virtualH}}
  anchor={'foot':{'x':virtualW/2,'y':baseline}}
  if activity=='fishing':
   # Rods have no baked line: cast from their actual forward tip in the current pose.
   eligible=mask.copy();eligible[round(footY-cell.shape[0]*.12):]=False;tipXs=np.where(eligible)[1];tipX=int(tipXs.max());tipYs=np.where(eligible[:,max(0,tipX-2):tipX+1])[0];tipY=float(np.median(tipYs));anchor['rodTip']={'x':round(left+tipX-l,2),'y':round(top+tipY-t,2)}
  anchors[name]=anchor
 meta={'image':f'{skin}-{material}.png','size':{'w':W,'h':H},'source':src.name,'sourceFrame':{'width':virtualW,'height':virtualH,'baseline':baseline,'scale':reference['meta']['sourceFrame']['scale']*refH/H},'skin':skin,'material':material,'facing':'right','integratedTools':{a:f'{material}-{k}' for a,k in zip(activities,kinds)},'equippedToolLayer':False,'anchors':anchors,'animations':reference['meta']['animations']}
 target=output/f'{skin}-{material}';shutil.copy2(src,target.with_suffix('.png'));target.with_suffix('.json').write_text(json.dumps({'frames':frames,'meta':meta},indent=2)+'\n');print(target.name,flush=True)
# Generate a typed, bundled catalog so images and frame coordinates share the same build.
paths=sorted(output.glob('*.json'));imports=[];entries=[]
for i,path in enumerate(paths):
 imports.append(f"import sheet{i} from '../public/assets/characters/gathering/baked/{path.name}';");entries.append(f"  '{path.stem}': sheet{i},")
(root/'apps/web/src/baked-gathering-atlases.ts').write_text('\n'.join(imports)+"\nexport const bakedGatheringAtlases = {\n"+'\n'.join(entries)+"\n};\n")
