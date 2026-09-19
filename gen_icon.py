# -*- coding: utf-8 -*-
"""BotCraft 应用图标生成器。

设计（2026-09-19 版）：indigo→violet 对角渐变圆角底 + 白色扁头 + 两只圆眼 + 天线
（浅紫信号灯）。选定理由见 build_exe/_icon_cand.py 的四方案对比：机器人脸+微笑在
32px 以下会把嘴糊成灰噪点，气泡方案的三个点会连成黑带，只有「扁头 + 两点眼」从
256px 到 16px 全程干净。

**小尺寸不用主版缩放**：16/24px 另用一套 mini 几何（去掉天线与信号灯、脸放大到
67%、眼按 16px 网格反推成 2.5px），且以目标尺寸的 8 倍绘制再降采样 —— 512→16 是
32 倍降采样，会把 2px 级特征平均成灰雾。

产物（四处必须同步，脚本一把改完）：
  1. botcraft.ico              —— 源，16/24/32/48/64/128/256 共 7 档
  2. BotCraft/botcraft.ico     —— 打包用（build_run.py --icon 指向这里）
  3. BotCraft/BotCraft.html    —— 内联 favicon（base64，就地替换而非「有就跳过」）
  4. BotCraft/BotCraft.html    —— 界面品牌标记 .logo .dot 的内联 SVG（顶栏 + 登录页两处）

用法：python gen_icon.py            # 生成 ico + 注入 favicon + 注入 logo + 出预览图
      python gen_icon.py --dry      # 只出预览图，不写 ico/HTML
"""
import base64
import io
import os
import re
import struct
import sys

from PIL import Image, ImageDraw

# 路径自适应：脚本放在仓库内（BotCraft/）或工作区根都能跑，不写死绝对路径 ——
# 旧版写死了 D:/桌面/BotCraft.html，源码一挪窝 favicon 注入就永远失效。
HERE = os.path.dirname(os.path.abspath(__file__))
APP = HERE if os.path.exists(os.path.join(HERE, 'BotCraft.html')) \
    else os.path.join(HERE, 'BotCraft')
ROOT = os.path.dirname(APP)
ICO_ROOT = os.path.join(ROOT, 'botcraft.ico')     # 工作区副本（.url 快捷方式与仓库标识用）
ICO_APP = os.path.join(APP, 'botcraft.ico')       # 打包用（build_run.py --icon 指向这里）
HTML = os.path.join(APP, 'BotCraft.html')
_PREV_DIR = os.path.join(ROOT, 'build_exe')
PREVIEW = os.path.join(_PREV_DIR if os.path.isdir(_PREV_DIR) else ROOT, '_icon_final.png')

SIZES = [16, 24, 32, 48, 64, 128, 256]
MINI_UPTO = 24                       # ≤ 此值走 mini 几何
SS = 512                             # 主版设计画布

C1 = (99, 102, 241)                  # indigo-500（与 --brand 注释一致）
C2 = (139, 92, 246)                  # violet-500
FACE = (255, 255, 255, 242)
INK = (30, 32, 46, 255)
LAMP = (196, 181, 253, 255)          # violet-300：天线信号灯，与白脸区分
RADIUS_R = 0.219                     # 圆角比例（延续原图标）
HI_ALPHA = 40                        # 左上玻璃高光


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def backdrop(n):
    """对角渐变 + 圆角裁切 + 左上高光 → 一张 n×n 的底。"""
    img = Image.new('RGB', (n, n))
    px = img.load()
    for y in range(n):
        for x in range(n):
            t = (x + y) / (2 * (n - 1))
            px[x, y] = lerp(C1, C2, t)
    img = img.convert('RGBA')
    hl = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    ImageDraw.Draw(hl).ellipse([n * .03, n * .01, n * .75, n * .68],
                               fill=(255, 255, 255, HI_ALPHA))
    img = Image.alpha_composite(img, hl)
    mask = Image.new('L', (n, n), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, n - 1, n - 1],
                                           radius=int(RADIUS_R * n), fill=255)
    out = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def draw_head(img, n, mini):
    c = float(n)
    d = ImageDraw.Draw(img)
    if mini:
        # 按 16px 网格反推：脸 11px(67%)、眼 2.5px(16%)、眼心距 ±12.5%
        d.rounded_rectangle([c * .165, c * .275, c * .835, c * .725],
                            radius=int(c * .165), fill=FACE)
        r = c * .080
        for cx in (.375, .625):
            d.ellipse([c * cx - r, c * .50 - r, c * cx + r, c * .50 + r], fill=INK)
    else:
        # 天线（短而粗，保证 32px 还看得见）+ 信号灯
        d.line([(c * .5, c * .175), (c * .5, c * .288)], fill=FACE, width=int(c * .032))
        d.ellipse([c * (.5 - .038), c * (.137 - .038), c * (.5 + .038), c * (.137 + .038)],
                  fill=LAMP)
        d.rounded_rectangle([c * .215, c * .285, c * .785, c * .715],
                            radius=int(c * .118), fill=FACE)
        r = c * .062
        for cx in (.395, .605):
            d.ellipse([c * cx - r, c * .50 - r, c * cx + r, c * .50 + r], fill=INK)
    return img


def render(size):
    mini = size <= MINI_UPTO
    n = max(size * 8, 128) if mini else SS
    img = draw_head(backdrop(n), n, mini)
    return img.resize((size, size), Image.LANCZOS)


def build_ico(frames):
    """自拼 ICO：每档都是独立绘制的不同几何，不能让 PIL 从一个源图统一缩放。

    全档用 PNG 压缩（Vista+ 支持；与本项目原图标口径一致），体积远小于 BMP 承载。
    """
    blobs = []
    for im in frames:
        buf = io.BytesIO()
        im.save(buf, format='PNG', optimize=True)
        blobs.append(buf.getvalue())
    n = len(frames)
    offset = 6 + 16 * n
    entries, body = b'', b''
    for im, blob in zip(frames, blobs):
        w = im.width if im.width < 256 else 0
        h = im.height if im.height < 256 else 0
        entries += struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, len(blob), offset)
        body += blob
        offset += len(blob)
    return struct.pack('<HHH', 0, 1, n) + entries + body


def preview(frames):
    """出对照预览：每档放大 + 深/浅两种底，顺便看一眼在深色任务栏上的表现。"""
    T, pad = 150, 12
    W = pad + len(frames) * (T + pad)
    H = pad * 3 + T * 2 + 22
    canvas = Image.new('RGB', (W, H), (246, 246, 248))
    d = ImageDraw.Draw(canvas)
    d.rectangle([0, pad + T + pad, W, pad * 2 + T * 2], fill=(32, 33, 36))  # 深色带
    d.text((pad, 2), '浅色背景（资源管理器 / 浅色任务栏）', fill=(90, 90, 100))
    d.text((pad, pad + T + 4), '深色背景（Win11 深色任务栏）', fill=(200, 200, 210))
    for i, im in enumerate(frames):
        x = pad + i * (T + pad)
        big = im.resize((T, T), Image.NEAREST if im.width < 256 else Image.LANCZOS)
        canvas.paste(big, (x, pad), big)
        canvas.paste(big, (x, pad * 2 + T), big)
        d.text((x + 4, pad + T - 16), '%dpx' % im.width, fill=(70, 70, 80))
    canvas.save(PREVIEW)
    return os.path.getsize(PREVIEW)


def inject_favicon(ico_bytes):
    """就地替换 HTML 里的 favicon：**替换**而非「已存在就跳过」——旧脚本那种写法
    导致重生成图标后 favicon 永远停在第一版（并且它指向的 D:/桌面 路径早已失效）。"""
    with open(HTML, 'r', encoding='utf-8', newline='') as f:
        h = f.read()
    b64 = base64.b64encode(ico_bytes).decode()
    link = '<link rel="icon" href="data:image/x-icon;base64,' + b64 + '">'
    pat = re.compile(r'<link rel="icon" href="data:image/x-icon;base64,[A-Za-z0-9+/=]*">')
    if pat.search(h):
        h2, n = pat.subn(link, h, count=1)
        action = 'REPLACED'
    elif '<link rel="icon"' in h:
        raise SystemExit('HTML 里存在 favicon 但不是预期的 data:image/x-icon 形式，请人工确认')
    else:
        marker = '<title>BotCraft'
        i = h.find(marker)
        j = h.find('</title>', i) + len('</title>')
        h2, n = h[:j] + '\n  ' + link + h[j:], 1
        action = 'INJECTED'
    with open(HTML, 'w', encoding='utf-8', newline='') as f:
        f.write(h2)
    return action, n, len(link)


# ---------------------------------------------------------------- 界面品牌标记
# .logo .dot（顶栏 + 登录页两处的 `<div class="dot">…</div>`）的内联 SVG。
# 与图标本体同源：机器人脸几何、圆角比例 RADIUS_R、底色渐变方向（135° 对角）。
#
# 为什么不直接套主版几何：界面标记实际只有 28 CSS 像素，而 Windows 常见 100% 缩放
# （DPR=1）—— 主版天线 0.032×28 = 0.9px 会被抗锯齿摊成一道灰雾，与「16px 不该画
# 天线」是同一条判据（见 _icon_cand.py 的四方案实测）。故按 28px 重算：杆 0.068、
# 灯 0.052、脸放宽到 0.155~0.845，保证 DPR=1 下仍能读出「天线 + 扁头 + 两点眼」。
# 几何对比与实尺寸排版观感见 build_exe/_dot_geom.png。
#
# 底色走 CSS 变量而非写死 #6366f1：浅色主题会把 --brand/--brand-hi 整体加深
# （#8b5cf6→#7c3aed），写死会让 logo 在浅色底上过亮；而且 --brand-hi 目前唯一的
# 使用点就是这里，写死等于把它变成零引用的死令牌 —— 正是前一轮刚清理过的那类问题。
LOGO_VIEWBOX = 32                    # SVG 内部坐标系（取 8 的倍数，便于与 0~1 比例互转）
LOGO_DOT = 28                        # CSS 里 .logo .dot 的像素尺寸（守卫会核对）

LOGO_GEOM = {
    'rx': RADIUS_R,                       # 底：圆角比例，与图标同
    'ant': (0.170, 0.320, 0.068),         # 天线杆：y1, y2, 线宽
    'lamp': (0.122, 0.052),               # 信号灯：圆心 y, 半径
    'face': (0.155, 0.310, 0.845, 0.750),  # 脸：x1, y1, x2, y2
    'face_r': 0.155,                      # 脸的圆角
    'eye': (0.078, 0.125, 0.530),         # 眼：半径, 左右偏移, 圆心 y
}

# 只匹配 `<div class="dot">`（空元素或已含一处 svg）—— .line-chart 的 `<circle class="dot">`
# 与 .ctxp-dot 都不是这个写法，不会被误伤。
LOGO_RE = re.compile(r'<div class="dot">(?:\s*<svg\b.*?</svg>\s*)?</div>', re.S)


def logo_svg(gid):
    """生成一处 .logo .dot 的内联 SVG。

    gid 必须逐处不同：同一文档里重复 id，第二个 <linearGradient> 会被忽略，
    第二个 logo 的底色引用到第一个的渐变（视觉上碰巧一样，但文档是坏的）。
    """
    v = float(LOGO_VIEWBOX)
    g = LOGO_GEOM
    q = lambda t: ('%.2f' % (t * v)).rstrip('0').rstrip('.')

    fx1, fy1, fx2, fy2 = g['face']
    ay1, ay2, aw = g['ant']
    lcy, lr = g['lamp']
    er, edx, ecy = g['eye']
    ex1, ex2 = 0.5 - edx, 0.5 + edx

    return (
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 %d %d'"
        " aria-hidden='true' focusable='false'>"
        "<defs><linearGradient id='%s' x1='0' y1='0' x2='1' y2='1'>"
        "<stop offset='0' style='stop-color:var(--brand-hi)'/>"
        "<stop offset='1' style='stop-color:var(--brand)'/>"
        "</linearGradient></defs>"
        "<rect width='%d' height='%d' rx='%s' fill='url(#%s)'/>"
        "<path d='M%s %sV%s' stroke='#fff' stroke-width='%s'/>"
        "<circle cx='%s' cy='%s' r='%s' fill='#c4b5fd'/>"
        "<rect x='%s' y='%s' width='%s' height='%s' rx='%s' fill='#fff'/>"
        "<circle cx='%s' cy='%s' r='%s' fill='#1e202e'/>"
        "<circle cx='%s' cy='%s' r='%s' fill='#1e202e'/>"
        "</svg>"
    ) % (LOGO_VIEWBOX, LOGO_VIEWBOX, gid, LOGO_VIEWBOX, LOGO_VIEWBOX,
         q(g['rx']), gid,
         q(0.5), q(ay1), q(ay2), q(aw),
         q(0.5), q(lcy), q(lr),
         q(fx1), q(fy1), q(fx2 - fx1), q(fy2 - fy1), q(g['face_r']),
         q(ex1), q(ecy), q(er), q(ex2), q(ecy), q(er))


def inject_logo():
    """把两处 .logo .dot 就地替换成内联 SVG（幂等：第二次跑匹配到已注入的那份）。"""
    with open(HTML, 'r', encoding='utf-8', newline='') as f:
        h = f.read()
    seen = [0]

    def rep(_m):
        seen[0] += 1
        return '<div class="dot">' + logo_svg('bcLogoG%d' % seen[0]) + '</div>'

    h2, n = LOGO_RE.subn(rep, h)
    if n != 2:
        raise SystemExit('<div class="dot"> 命中 %d 处（预期 2：顶栏 + 登录页），拒绝写入' % n)
    with open(HTML, 'w', encoding='utf-8', newline='') as f:
        f.write(h2)
    return n, len(logo_svg('bcLogoG1'))


if __name__ == '__main__':
    dry = '--dry' in sys.argv
    frames = [render(s) for s in SIZES]
    for im in frames:
        assert im.size == (im.width, im.width), im.size

    ico = build_ico(frames)
    print('sizes      :', ','.join(str(s) for s in SIZES))
    print('ico bytes  :', len(ico))
    print('preview    :', preview(frames), 'bytes ->', PREVIEW)
    if dry:
        print('DRY_RUN    未写 ico / HTML')
        raise SystemExit(0)

    for p in (ICO_ROOT, ICO_APP):
        with open(p, 'wb') as f:
            f.write(ico)
        print('ico written:', p, os.path.getsize(p))

    action, n, linklen = inject_favicon(ico)
    print('favicon    : %s x%d  (link %d 字符)' % (action, n, linklen))
    ln, svglen = inject_logo()
    print('logo       : INJECTED x%d  (每处 svg %d 字符)' % (ln, svglen))
    print('html bytes : %d' % os.path.getsize(HTML))
    print('GEN_ICON_OK')
