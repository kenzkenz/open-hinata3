import sys
import json
import ezdxf
from shapely.geometry import shape
from ezdxf.enums import TextEntityAlignment

if len(sys.argv) != 3:
    print("Usage: python convert_to_dxf.py <geojson_file> <output_dxf>")
    sys.exit(1)

geojson_file = sys.argv[1]
output_dxf = sys.argv[2]

with open(geojson_file, 'r') as f:
    geojson_data = json.load(f)

doc = ezdxf.new("R2010")
msp = doc.modelspace()

for feature in geojson_data['features']:
    geom = shape(feature['geometry'])
    if geom.geom_type == 'Polygon':
        coords = list(geom.exterior.coords)
        msp.add_lwpolyline(coords + [coords[0]])  # ポリゴンを描画
        centroid = geom.centroid
        # "地番"をラベルとして取得、デフォルトは"NoChiban"
        label = feature['properties'].get('地番', '')
        msp.add_text(label, dxfattribs={"height": 1.0}).set_placement(
            (centroid.x, centroid.y), align=TextEntityAlignment.MIDDLE_CENTER
        )

doc.saveas(output_dxf)