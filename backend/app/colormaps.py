"""The colour maps the tile servers draw with: rio-tiler's built-in ones plus HCDP's own."""

from rio_tiler.colormap import cmap
from titiler.core.dependencies import create_colormap_dependency

# The colours HCDP layers are drawn in, lowest value first
HCDP_PALETTE = ["#313695", "#74add1", "#fee090", "#f46d43", "#a50026"]


# 256 steps blending evenly between the colours, rounded half up like the browser's colour scale
def _blend(palette: list[str]) -> dict[int, tuple[int, int, int, int]]:
    rgb = [tuple(int(color[i : i + 2], 16) for i in (1, 3, 5)) for color in palette]
    steps = len(rgb) - 1
    table = {}
    for i in range(256):
        position = i / 255 * steps
        k = min(int(position), steps - 1)
        share = position - k
        low, high = rgb[k], rgb[k + 1]
        r, g, b = (int(low[j] + (high[j] - low[j]) * share + 0.5) for j in range(3))
        table[i] = (r, g, b, 255)
    return table


COLORMAPS = cmap.register({"hcdp": _blend(HCDP_PALETTE)})

# The colormap_name / colormap query parameters, looked up in COLORMAPS
ColorMapParams = create_colormap_dependency(COLORMAPS)
