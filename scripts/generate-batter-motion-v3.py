#!/usr/bin/env python3
"""Export Batter Motion Loop V3 authored intermediates.

V3 fixes the V2 failure where a broad bat erase mask could eat helmet/face pixels.
The body may still use nearest-neighbour landmark warps, but:
- bat pixels are isolated from their own source palette and moved as a rigid layer;
- head/helmet pixels are re-overlaid from the clean source after the body warp;
- two extra bridge poses are authored around contact to reduce the largest jumps.

Runtime never invokes this file. It is an offline authoring/export helper.
"""
from pathlib import Path
import math

import cv2
import numpy as np
from PIL import Image, ImageFile
from scipy.spatial import Delaunay

ImageFile.LOAD_TRUNCATED_IMAGES = True
ROOT = Path(__file__).resolve().parents[1]
V1 = ROOT / "assets" / "batter-reboot-v1"
V3 = ROOT / "assets" / "batter-reboot-v3"
SIZE = 192

BOUNDARY = [
    (0,0),(48,0),(96,0),(144,0),(191,0),
    (0,48),(191,48),(0,96),(191,96),(0,144),(191,144),
    (0,191),(48,191),(96,191),(144,191),(191,191),
]

def load_rgba(name):
    arr=np.array(Image.open(V1/name).convert("RGBA"))
    alpha=arr[:,:,3]
    background=(alpha<=8)|((arr[:,:,:3].max(axis=2)<8)&(alpha<40))
    arr[background,3]=0
    return arr

def line_mask(p1,p2,width):
    mask=np.zeros((SIZE,SIZE),np.uint8)
    cv2.line(mask,tuple(map(int,p1)),tuple(map(int,p2)),255,width,lineType=cv2.LINE_8)
    cv2.circle(mask,tuple(map(int,p1)),max(2,width//2),255,-1)
    return mask

def ellipse_mask(center,axes):
    mask=np.zeros((SIZE,SIZE),np.uint8)
    cv2.ellipse(mask,tuple(map(int,center)),tuple(map(int,axes)),0,0,360,255,-1,lineType=cv2.LINE_8)
    return mask

def warp_piecewise(src,src_pts,dst_pts):
    src_pts=np.array(src_pts,np.float32)
    dst_pts=np.array(dst_pts,np.float32)
    triangles=Delaunay(dst_pts)
    out=np.zeros((SIZE,SIZE,4),dtype=np.uint8)
    srcf=src.astype(np.float32)
    for inds in triangles.simplices:
        source=src_pts[inds]; target=dst_pts[inds]
        sx,sy,sw,sh=cv2.boundingRect(source)
        dx,dy,dw,dh=cv2.boundingRect(target)
        if min(sw,sh,dw,dh)<=0: continue
        source_local=source-[sx,sy]
        target_local=target-[dx,dy]
        matrix=cv2.getAffineTransform(source_local.astype(np.float32),target_local.astype(np.float32))
        patch=srcf[sy:sy+sh,sx:sx+sw]
        warped=cv2.warpAffine(patch,matrix,(dw,dh),flags=cv2.INTER_NEAREST,borderMode=cv2.BORDER_CONSTANT,borderValue=(0,0,0,0))
        mask=np.zeros((dh,dw),np.uint8)
        cv2.fillConvexPoly(mask,np.int32(np.round(target_local)),255,lineType=cv2.LINE_8)
        y0,y1=max(0,dy),min(SIZE,dy+dh)
        x0,x1=max(0,dx),min(SIZE,dx+dw)
        if y0>=y1 or x0>=x1: continue
        py0,py1=y0-dy,y1-dy
        px0,px1=x0-dx,x1-dx
        region=out[y0:y1,x0:x1]
        wr=warped[py0:py1,px0:px1].astype(np.uint8)
        inside=mask[py0:py1,px0:px1]>0
        region[inside]=wr[inside]
    return out

def similarity(src_tip,src_knob,dst_tip,dst_knob):
    s1,s2=np.array(src_tip,float),np.array(src_knob,float)
    d1,d2=np.array(dst_tip,float),np.array(dst_knob,float)
    sv,dv=s1-s2,d1-d2
    scale=np.linalg.norm(dv)/max(1e-6,np.linalg.norm(sv))
    angle=math.atan2(dv[1],dv[0])-math.atan2(sv[1],sv[0])
    ca,sa=math.cos(angle)*scale,math.sin(angle)*scale
    affine=np.array([[ca,-sa],[sa,ca]])
    translate=d2-affine@s2
    return np.hstack([affine,translate.reshape(2,1)]).astype(np.float32)

def transform_layer(layer,matrix):
    return cv2.warpAffine(layer,matrix,(SIZE,SIZE),flags=cv2.INTER_NEAREST,borderMode=cv2.BORDER_CONSTANT,borderValue=(0,0,0,0))

def translate_layer(layer,dx,dy):
    return transform_layer(layer,np.array([[1,0,dx],[0,1,dy]],np.float32))

def alpha_over(base,overlay):
    b=base.astype(np.float32)
    o=overlay.astype(np.float32)
    oa=o[:,:,3:4]/255.0
    ba=b[:,:,3:4]/255.0
    out_a=oa+ba*(1-oa)
    rgb=np.where(out_a>1e-6,(o[:,:,:3]*oa+b[:,:,:3]*ba*(1-oa))/np.maximum(out_a,1e-6),0)
    out=np.zeros_like(base)
    out[:,:,:3]=np.clip(rgb,0,255).astype(np.uint8)
    out[:,:,3]=np.clip(out_a[:,:,0]*255,0,255).astype(np.uint8)
    return out

def palette_bat_mask(src,tip,knob,width=11):
    """Select only bat-colored pixels inside the bat tube.

    V2 erased a wide geometric line. That line crossed helmet/face pixels in the
    trigger pose. V3 samples the barrel half of the bat itself, then erases only
    pixels matching that sampled pixel-art palette.
    """
    tip=np.array(tip,float); knob=np.array(knob,float)
    mid=tip+(knob-tip)*0.58
    sample=line_mask(tip,mid,max(6,width-2))>0
    opaque=(src[:,:,3]>20)
    sample_pixels=src[:,:,:3][sample&opaque]
    if sample_pixels.size==0:
        return (line_mask(tip,knob,max(5,width-3))>0)&opaque
    colors,counts=np.unique(sample_pixels.reshape(-1,3),axis=0,return_counts=True)
    order=np.argsort(counts)[::-1][:14]
    palette=colors[order].astype(np.int16)
    tube=(line_mask(tip,knob,width)>0)&opaque
    rgb=src[:,:,:3].astype(np.int16)
    distances=np.min(np.sum((rgb[:,:,None,:]-palette[None,None,:,:])**2,axis=3),axis=2)
    return tube&(distances<=64)

def split_bat(src,tip,knob,width=11):
    mask=palette_bat_mask(src,tip,knob,width)
    body=src.copy(); body[mask]=0
    bat=np.zeros_like(src); bat[mask]=src[mask]
    return body,bat

def head_layer(src,center,axes):
    mask=(ellipse_mask(center,axes)>0)&(src[:,:,3]>10)
    layer=np.zeros_like(src); layer[mask]=src[mask]
    return layer

def rigid_bat(bat,src_tip,src_knob,dst_tip,dst_knob):
    return transform_layer(bat,similarity(src_tip,src_knob,dst_tip,dst_knob))

def compose_pose(body,bat=None,head=None):
    out=np.zeros_like(body)
    if bat is not None: out=alpha_over(out,bat)   # bat behind hands/head
    out=alpha_over(out,body)
    if head is not None: out=alpha_over(out,head) # pristine face/helmet wins
    return out

ready=load_rgba("batter-ready.png")
trigger=load_rgba("batter-trigger.png")
contact=load_rgba("batter-contact.png")
finish=load_rgba("batter-finish.png")

# LOAD — small weight shift only. Re-overlay the clean head so facial pixels never shear.
ready_pts=[
    (86,8),(77,30),(65,53),(60,65),(68,75),
    (91,54),(108,64),(77,76),(96,80),(56,73),(79,84),
    (90,95),(79,109),(99,109),(70,136),(115,135),(61,156),(129,155),(55,171),(139,170),
    (66,119),(108,119),(58,144),(124,144),
]+BOUNDARY
load_pts=[
    (89,8),(79,30),(64,52),(58,64),(68,74),
    (89,56),(106,66),(75,77),(95,81),(54,71),(79,83),
    (88,97),(77,110),(98,110),(68,138),(115,136),(60,157),(130,156),(55,171),(140,170),
    (64,120),(107,120),(57,145),(125,145),
]+BOUNDARY
load_body=warp_piecewise(ready,ready_pts,load_pts)
load=alpha_over(load_body,translate_layer(head_layer(ready,(82,36),(24,30)),2,0))

# Shared trigger body landmarks for pre-contact bridges.
trigger_body_pts=[
    (91,55),(107,65),(76,76),(97,80),(54,72),(79,84),
    (91,96),(80,109),(101,109),(73,136),(118,134),(62,157),(134,155),(57,171),(144,169),
    (68,119),(111,118),(59,145),(128,145),
]+BOUNDARY
swing_start_pts=[
    (91,56),(108,65),(79,77),(101,79),(60,75),(86,82),
    (94,96),(82,109),(104,109),(71,138),(119,134),(59,157),(134,155),(53,171),(143,169),
    (69,120),(112,118),(57,146),(129,145),
]+BOUNDARY
swing_mid_pts=[
    (93,58),(110,65),(83,78),(105,79),(68,78),(94,81),
    (98,96),(86,109),(108,109),(70,139),(121,134),(58,158),(135,155),(52,171),(143,169),
    (72,121),(114,118),(56,147),(130,145),
]+BOUNDARY

trigger_clean,trigger_bat=split_bat(trigger,(90,5),(62,61),11)
trigger_head=head_layer(trigger_clean,(83,48),(23,27))

swing_start_body=warp_piecewise(trigger_clean,trigger_body_pts,swing_start_pts)
swing_start_bat=rigid_bat(trigger_bat,(90,5),(62,61),(138,44),(89,72))
swing_start=compose_pose(swing_start_body,swing_start_bat,translate_layer(trigger_head,2,1))

swing_mid_body=warp_piecewise(trigger_clean,trigger_body_pts,swing_mid_pts)
swing_mid_bat=rigid_bat(trigger_bat,(90,5),(62,61),(158,66),(101,76))
swing_mid=compose_pose(swing_mid_body,swing_mid_bat,translate_layer(trigger_head,4,2))

# POST-CONTACT — preserve clean contact face while the barrel travels around the body.
contact_body_pts=[
    (82,60),(101,66),(82,78),(101,79),(88,82),(107,82),
    (93,98),(81,111),(102,111),(67,139),(118,135),(57,158),(130,156),(51,171),(137,169),
    (69,121),(111,119),(55,147),(127,146),
]+BOUNDARY
follow_early_pts=[
    (96,56),(112,64),(90,76),(108,75),(91,78),(109,77),
    (101,96),(89,111),(109,110),(72,140),(122,134),(63,158),(134,155),(58,171),(142,169),
    (74,122),(116,118),(61,147),(130,145),
]+BOUNDARY
follow_late_pts=[
    (103,54),(119,62),(96,75),(114,73),(98,76),(114,75),
    (106,96),(93,111),(113,110),(75,140),(124,134),(65,158),(135,155),(60,171),(143,169),
    (77,122),(118,118),(63,147),(131,145),
]+BOUNDARY

contact_clean,contact_bat=split_bat(contact,(176,88),(110,77),12)
contact_head=head_layer(contact_clean,(84,64),(23,25))

follow_early_body=warp_piecewise(contact_clean,contact_body_pts,follow_early_pts)
follow_early_bat=rigid_bat(contact_bat,(176,88),(110,77),(151,37),(110,73))
follow_early=compose_pose(follow_early_body,follow_early_bat,translate_layer(contact_head,5,-2))

follow_late_body=warp_piecewise(contact_clean,contact_body_pts,follow_late_pts)
follow_late_bat=rigid_bat(contact_bat,(176,88),(110,77),(91,18),(111,69))
follow_late=compose_pose(follow_late_body,follow_late_bat,translate_layer(contact_head,8,-3))

# SETTLE — preserve the approved finish silhouette and only release tension.
finish_pts=[
    (34,34),(58,40),(82,50),(88,59),(92,63),
    (106,51),(120,62),(96,75),(116,76),(87,63),(100,76),
    (108,95),(96,110),(115,110),(78,139),(125,134),(67,157),(137,155),(62,171),(144,169),
    (80,120),(121,118),(66,147),(133,145),
]+BOUNDARY
settle_pts=[
    (39,38),(61,43),(82,53),(88,62),(93,66),
    (105,55),(120,65),(96,78),(116,79),(87,67),(101,79),
    (107,98),(96,112),(115,112),(79,141),(124,136),(68,159),(136,157),(63,171),(143,170),
    (81,122),(120,120),(67,148),(132,146),
]+BOUNDARY
settle_body=warp_piecewise(finish,finish_pts,settle_pts)
settle=alpha_over(settle_body,translate_layer(head_layer(finish,(95,66),(24,24)),1,1))

V3.mkdir(parents=True,exist_ok=True)
exports={
    "batter-load.png":load,
    "batter-swing-start.png":swing_start,
    "batter-swing-mid.png":swing_mid,
    "batter-follow-through-early.png":follow_early,
    "batter-follow-through-late.png":follow_late,
    "batter-settle.png":settle,
}
for name,arr in exports.items():
    Image.fromarray(arr,"RGBA").save(V3/name,optimize=True)

print("generated",", ".join(str(V3/name) for name in exports))
