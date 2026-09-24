#!/usr/bin/env python3
"""Build the four Batter Motion Loop V2 intermediate PNGs.

This is an OFFLINE authoring/export helper only. Runtime rendering never calls it.
The four approved V1 anchor PNGs remain byte-for-byte untouched. The script moves
key landmarks with nearest-neighbour piecewise affine warps and reuses the
authored bat pixels so the exported poses stay on the same 192x192 pixel canvas.
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
V2 = ROOT / "assets" / "batter-reboot-v2"
SIZE = 192

BOUNDARY = [
    (0,0),(48,0),(96,0),(144,0),(191,0),
    (0,48),(191,48),(0,96),(191,96),(0,144),(191,144),
    (0,191),(48,191),(96,191),(144,191),(191,191),
]

def load_rgba(name):
    arr = np.array(Image.open(V1 / name).convert("RGBA"))
    alpha = arr[:, :, 3]
    background = (alpha <= 8) | ((arr[:, :, :3].max(axis=2) < 8) & (alpha < 40))
    arr[background, 3] = 0
    return arr

def line_mask(p1, p2, width):
    mask = np.zeros((SIZE, SIZE), np.uint8)
    cv2.line(mask, tuple(map(int, p1)), tuple(map(int, p2)), 255, width, lineType=cv2.LINE_8)
    cv2.circle(mask, tuple(map(int, p1)), width // 2 + 1, 255, -1)
    return mask

def warp_piecewise(src, src_pts, dst_pts):
    src_pts = np.array(src_pts, np.float32)
    dst_pts = np.array(dst_pts, np.float32)
    triangles = Delaunay(dst_pts)
    out = np.zeros((SIZE, SIZE, 4), dtype=np.uint8)
    srcf = src.astype(np.float32)

    for inds in triangles.simplices:
        source = src_pts[inds]
        target = dst_pts[inds]
        sx, sy, sw, sh = cv2.boundingRect(source)
        dx, dy, dw, dh = cv2.boundingRect(target)
        if min(sw, sh, dw, dh) <= 0:
            continue

        source_local = source - [sx, sy]
        target_local = target - [dx, dy]
        matrix = cv2.getAffineTransform(source_local.astype(np.float32), target_local.astype(np.float32))
        patch = srcf[sy:sy + sh, sx:sx + sw]
        warped = cv2.warpAffine(
            patch, matrix, (dw, dh),
            flags=cv2.INTER_NEAREST,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(0,0,0,0),
        )
        mask = np.zeros((dh, dw), np.uint8)
        cv2.fillConvexPoly(mask, np.int32(np.round(target_local)), 255, lineType=cv2.LINE_8)

        y0, y1 = max(0, dy), min(SIZE, dy + dh)
        x0, x1 = max(0, dx), min(SIZE, dx + dw)
        if y0 >= y1 or x0 >= x1:
            continue
        py0, py1 = y0 - dy, y1 - dy
        px0, px1 = x0 - dx, x1 - dx
        region = out[y0:y1, x0:x1]
        warped_region = warped[py0:py1, px0:px1].astype(np.uint8)
        inside = mask[py0:py1, px0:px1] > 0
        region[inside] = warped_region[inside]
    return out

def similarity(src_tip, src_knob, dst_tip, dst_knob):
    s1, s2 = np.array(src_tip, float), np.array(src_knob, float)
    d1, d2 = np.array(dst_tip, float), np.array(dst_knob, float)
    sv, dv = s1 - s2, d1 - d2
    scale = np.linalg.norm(dv) / np.linalg.norm(sv)
    angle = math.atan2(dv[1], dv[0]) - math.atan2(sv[1], sv[0])
    ca, sa = math.cos(angle) * scale, math.sin(angle) * scale
    affine = np.array([[ca, -sa], [sa, ca]])
    translate = d2 - affine @ s2
    return np.hstack([affine, translate.reshape(2, 1)]).astype(np.float32)

def erase_bat(src, tip, knob, width):
    out = src.copy()
    out[line_mask(tip, knob, width) > 0, 3] = 0
    return out

def paste_bat(body, source, src_tip, src_knob, dst_tip, dst_knob, width):
    mask = line_mask(src_tip, src_knob, width)
    bat = np.zeros_like(source)
    select = (mask > 0) & (source[:, :, 3] > 10)
    bat[select] = source[select]
    matrix = similarity(src_tip, src_knob, dst_tip, dst_knob)
    warped = cv2.warpAffine(
        bat, matrix, (SIZE, SIZE),
        flags=cv2.INTER_NEAREST,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0,0,0,0),
    )
    out = body.copy()
    alpha = warped[:, :, 3:4].astype(np.float32) / 255.0
    out[:, :, :3] = (warped[:, :, :3] * alpha + out[:, :, :3] * (1 - alpha)).astype(np.uint8)
    out[:, :, 3] = np.maximum(out[:, :, 3], warped[:, :, 3])
    return out

ready = load_rgba("batter-ready.png")
trigger = load_rgba("batter-trigger.png")
contact = load_rgba("batter-contact.png")
finish = load_rgba("batter-finish.png")

# 1) load: weight shifts slightly back and down while feet/baseline remain fixed.
ready_pts = [
    (86,8),(77,30),(65,53),(60,65),(68,75),
    (91,54),(108,64),(77,76),(96,80),(56,73),(79,84),
    (90,95),(79,109),(99,109),(70,136),(115,135),(61,156),(129,155),(55,171),(139,170),
    (66,119),(108,119),(58,144),(124,144),
] + BOUNDARY
load_pts = [
    (91,6),(80,28),(63,50),(55,61),(66,72),
    (87,57),(104,67),(73,78),(94,82),(52,69),(78,82),
    (86,97),(75,111),(96,111),(67,140),(116,137),(60,157),(130,156),(55,171),(140,170),
    (63,121),(107,121),(57,146),(125,145),
] + BOUNDARY
load = warp_piecewise(ready, ready_pts, load_pts)

# 2) swing-start: hips/torso open while hands launch; barrel lags behind the hands.
trigger_body_pts = [
    (91,55),(107,65),(76,76),(97,80),(54,72),(79,84),
    (91,96),(80,109),(101,109),(73,136),(118,134),(62,157),(134,155),(57,171),(144,169),
    (68,119),(111,118),(59,145),(128,145),
] + BOUNDARY
swing_body_pts = [
    (90,57),(107,65),(78,77),(101,79),(61,75),(86,82),
    (94,96),(82,109),(104,109),(70,139),(119,134),(58,157),(134,155),(52,171),(143,169),
    (69,121),(112,118),(56,146),(129,145),
] + BOUNDARY
trigger_body = erase_bat(trigger, (90,5), (62,61), 18)
swing_body = warp_piecewise(trigger_body, trigger_body_pts, swing_body_pts)
swing_start = paste_bat(swing_body, trigger, (90,5), (62,61), (132,42), (87,72), 17)

# 3) follow-through-early: barrel continues upward after contact while rear side releases.
contact_body_pts = [
    (82,60),(101,66),(82,78),(101,79),(88,82),(107,82),
    (93,98),(81,111),(102,111),(67,139),(118,135),(57,158),(130,156),(51,171),(137,169),
    (69,121),(111,119),(55,147),(127,146),
] + BOUNDARY
follow_body_pts = [
    (96,56),(112,64),(90,76),(108,75),(91,78),(109,77),
    (101,96),(89,111),(109,110),(72,140),(122,134),(63,158),(134,155),(58,171),(142,169),
    (74,122),(116,118),(61,147),(130,145),
] + BOUNDARY
contact_body = erase_bat(contact, (176,88), (110,77), 20)
follow_body = warp_piecewise(contact_body, contact_body_pts, follow_body_pts)
follow_early = paste_bat(follow_body, contact, (176,88), (110,77), (151,38), (110,73), 19)

# 4) settle: keep the completed swing silhouette but release tension without snapping to ready.
finish_pts = [
    (34,34),(58,40),(82,50),(88,59),(92,63),
    (106,51),(120,62),(96,75),(116,76),(87,63),(100,76),
    (108,95),(96,110),(115,110),(78,139),(125,134),(67,157),(137,155),(62,171),(144,169),
    (80,120),(121,118),(66,147),(133,145),
] + BOUNDARY
settle_pts = [
    (43,41),(62,45),(82,54),(88,63),(93,67),
    (105,55),(120,66),(96,79),(116,79),(87,68),(101,80),
    (107,99),(96,113),(115,113),(79,141),(124,137),(68,159),(136,157),(63,171),(143,170),
    (81,123),(120,121),(67,149),(132,147),
] + BOUNDARY
settle = warp_piecewise(finish, finish_pts, settle_pts)

V2.mkdir(parents=True, exist_ok=True)
exports = {
    "batter-load.png": load,
    "batter-swing-start.png": swing_start,
    "batter-follow-through-early.png": follow_early,
    "batter-settle.png": settle,
}
for name, arr in exports.items():
    Image.fromarray(arr, "RGBA").save(V2 / name, optimize=True)

print("generated", ", ".join(str(V2 / name) for name in exports))
