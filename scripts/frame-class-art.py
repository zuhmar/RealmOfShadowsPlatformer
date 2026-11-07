"""Frame generated, integrated sprite sheets without altering their raster artwork.
Usage: python scripts/frame-class-art.py /tmp/baked-skin-art.json
The input is [{"id":"base-male-knight" or "armed-woods-male-knight", "path":"...png"}].
"""
from pathlib import Path
from PIL import Image
import json,sys,shutil,statistics
from collections import deque
root=Path(__file__).resolve().parents[1]/'apps/web/public/assets/characters/skins/integrated'

def cuts(count,size,density):
    result=[0]
    for i in range(1,count):
        expected=i*size/count;radius=int(size/count*.28)
        lo=max(result[-1]+1,int(expected)-radius);hi=min(size-1,int(expected)+radius)
        # Prefer a clear gutter, then the closest low-density boundary.
        best=min(range(lo,hi+1),key=lambda n:(density[n],abs(n-expected)))
        empty=[n for n in range(lo,hi+1) if density[n]==0]
        if empty:
            runs=[];start=last=empty[0]
            for n in empty[1:]:
                if n!=last+1:runs.append((start,last));start=n
                last=n
            runs.append((start,last))
            run=min(runs,key=lambda r:abs((r[0]+r[1])/2-expected));best=round((run[0]+run[1])/2)
        result.append(best)
    return result+[size]

def silhouette_bounds(alpha, gutter=1):
    """Exclude detached gutter specks; retain substantial detached weapons/arrows.
    Only returns crop metadata. Source pixels are never rewritten.
    """
    w,h=alpha.size; pixels=alpha.tobytes(); seen=bytearray(w*h); components=[]
    for start,value in enumerate(pixels):
        if value<96 or seen[start]:continue
        seen[start]=1; queue=deque([start]); count=0;x0=w;y0=h;x1=y1=0
        while queue:
            n=queue.popleft();y,x=divmod(n,w);count+=1
            x0=min(x0,x);x1=max(x1,x);y0=min(y0,y);y1=max(y1,y)
            for yy in range(max(0,y-1),min(h,y+2)):
                for xx in range(max(0,x-1),min(w,x+2)):
                    k=yy*w+xx
                    if not seen[k] and pixels[k]>=96:seen[k]=1;queue.append(k)
        components.append((count,(x0,y0,x1+1,y1+1)))
    if not components:raise ValueError('Empty sprite silhouette')
    components.sort(reverse=True);count,box=components[0];x0,y0,x1,y1=box
    for size,(l,t,r,b) in components[1:]:
        vertical=max(0,min(b,box[3])-max(t,box[1]))
        horizontal=max(0,box[0]-r,l-box[2])
        if size>=count*.005 and vertical>=(b-t)*.5 and horizontal<(box[3]-box[1])*.5:
            x0=min(x0,l);y0=min(y0,t);x1=max(x1,r);y1=max(y1,b)
    # Two source pixels retain the authored antialias fringe without the neighboring pose.
    return max(gutter,x0-2),max(gutter,y0-2),min(w-gutter,x1+2),min(h-gutter,y1+2)

def main():
    rows=json.loads(Path(sys.argv[1]).read_text())
    for job in rows:
        parts=job['id'].split('-');base=parts[0]=='base'
        if base:_,appearance,skin=parts;target=root/f'{appearance}-{skin}.png';names=['idle','walk','jump','climb','attack','hurt','death']
        else:_,tier,appearance,skin=parts;target=root/'armed'/tier/f'{appearance}-{skin}.png';names=['idle','walk','jump','attack','death']
        source=Path(job['path']);im=Image.open(source).convert('RGBA');a=im.getchannel('A')
        if a.histogram()[0]/(im.width*im.height)<.2:raise ValueError(f'Background is not clean alpha transparency: {job["id"]}')
        mask=a.point(lambda v:255 if v>=96 else 0)
        # Density scans are metadata inspection, not image modification.
        ydens=[sum(1 for v in mask.crop((0,y,im.width,y+1)).tobytes() if v) for y in range(im.height)]
        ys=cuts(len(names),im.height,ydens)
        # Attack reaches vary by row; global column cuts can split a sword at full extension.
        columns=[]
        for row in range(len(names)):
            density=[sum(1 for v in mask.crop((x,ys[row],x+1,ys[row+1])).tobytes() if v) for x in range(im.width)]
            columns.append(cuts(6,im.width,density))
        virtualW=max(xs[i+1]-xs[i] for xs in columns for i in range(6))+32
        virtualH=max(ys[i+1]-ys[i] for i in range(len(names)))+32
        baseline=virtualH-16;frames={};anchors={};heights=[]
        for row,name in enumerate(names):
            bounds=[]
            xs=columns[row]
            for col in range(6):
                cell=(xs[col],ys[row],xs[col+1],ys[row+1]);box=silhouette_bounds(a.crop(cell))
                if box is None:raise ValueError(f'Empty cell {job["id"]}:{name}-{col}')
                bounds.append((cell,box))
            for col,(cell,b) in enumerate(bounds):
                x,y,x2,y2=b;w=x2-x;h=y2-y
                # Anchor the feet, rather than uneven generated cell gutters.
                foot=mask.crop((cell[0]+x,cell[1]+y+round(h*.85),cell[0]+x2,cell[1]+y2))
                footbox=foot.getbbox()
                center=x+(footbox[0]+footbox[2])/2 if footbox else (x+x2)/2
                sx=round(virtualW/2-center+x);sy=baseline-h
                frameName=f'{name}-{col}'
                frames[frameName]={'frame':{'x':cell[0]+x,'y':cell[1]+y,'w':w,'h':h},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':sx,'y':sy,'w':w,'h':h},'sourceSize':{'w':virtualW,'h':virtualH}}
                anchors[frameName]={'hand':{'x':sx+w*(.9 if name=='attack' else .78),'y':sy+h*(.45 if name=='attack' else .62)}}
                if name=='idle':heights.append(h)
        target.parent.mkdir(parents=True,exist_ok=True)
        if source.resolve()!=target.resolve():shutil.copyfile(source,target)
        meta={'image':target.name,'size':{'w':im.width,'h':im.height},'sourceFrame':{'width':virtualW,'height':virtualH,'baseline':baseline,'scale':80/statistics.median(heights)},'framingVersion':2,'integratedHeadwear':True,'integratedWeapon':None if base else {'skin':skin,'tier':tier},'animations':{name:{'frames':[f'{name}-{n}'for n in range(6)],'frameRate':{'idle':6,'walk':10,'jump':10,'climb':8,'attack':10 if base else 12,'death':8}[name],'repeat':-1 if name in ['idle','walk','climb'] else 0}for name in names if name!='hurt'},'anchors':anchors}
        target.with_suffix('.json').write_text(json.dumps({'frames':frames,'meta':meta},indent=2)+'\n')
        print(job['id'],im.size,'rows',ys,'scale',round(meta['sourceFrame']['scale'],3))

if __name__=='__main__':main()
