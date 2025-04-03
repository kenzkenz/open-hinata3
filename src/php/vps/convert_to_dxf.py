# import sys
# import json
# import ezdxf
# from shapely.geometry import shape
# from ezdxf.enums import TextEntityAlignment

# # 引数の数が正しいか確認
# if len(sys.argv) != 4:
#     print("Usage: python convert_to_dxf.py <geojson_file> <output_dxf> <scale_factor>")
#     sys.exit(1)

# geojson_file = sys.argv[1]
# output_dxf = sys.argv[2]

# # スケール値を引数から取得し、数値に変換
# try:
#     SCALE_FACTOR = float(sys.argv[3])
# except ValueError:
#     print("Error: <scale_factor> must be a number")
#     sys.exit(1)

# with open(geojson_file, 'r') as f:
#     geojson_data = json.load(f)

# doc = ezdxf.new("R12", setup=True)
# doc.header['$DWGCODEPAGE'] = 'ANSI_932'  # 日本語対応
# msp = doc.modelspace()

# for feature in geojson_data['features']:
#     geom = shape(feature['geometry'])
#     if geom.geom_type == 'Polygon':
#         coords = list(geom.exterior.coords)
#         # スケール係数を適用
#         scaled_coords = [(x * SCALE_FACTOR, y * SCALE_FACTOR) for x, y in coords]
#         msp.add_polyline2d(scaled_coords + [scaled_coords[0]], dxfattribs={"closed": True})
#         centroid = geom.centroid
#         label = feature['properties'].get('地番', '')
#         # テキストの位置とサイズもスケールに合わせる
#         msp.add_text(label, dxfattribs={"height": 1000}).set_placement(
#             (centroid.x * SCALE_FACTOR, centroid.y * SCALE_FACTOR),
#             align=TextEntityAlignment.MIDDLE_CENTER
#         )

# doc.saveas(output_dxf)



# import sys
# import json
# import ezdxf
# from shapely.geometry import shape
# from ezdxf.enums import TextEntityAlignment

# if len(sys.argv) != 3:
#     print("Usage: python convert_to_dxf.py <geojson_file> <output_dxf>")
#     sys.exit(1)

# geojson_file = sys.argv[1]
# output_dxf = sys.argv[2]

# # スケール値を引数から取得し、数値に変換
# try:
#     SCALE_FACTOR = float(sys.argv[3])
# except ValueError:
#     print("Error: <scale_factor> must be a number")
#     sys.exit(1)

# with open(geojson_file, 'r') as f:
#     geojson_data = json.load(f)

# doc = ezdxf.new("R12", setup=True)  # R12形式を維持
# doc.header['$DWGCODEPAGE'] = 'ANSI_932'  # 日本語対応
# msp = doc.modelspace()

# for feature in geojson_data['features']:
#     geom = shape(feature['geometry'])
#     if geom.geom_type == 'Polygon':
#         coords = list(geom.exterior.coords)
#         # スケール係数を適用
#         scaled_coords = [(x * SCALE_FACTOR, y * SCALE_FACTOR) for x, y in coords]
#         msp.add_polyline2d(scaled_coords + [scaled_coords[0]], dxfattribs={"closed": True})
#         centroid = geom.centroid
#         label = feature['properties'].get('地番', '')
#         # テキストの位置とサイズもスケールに合わせる
#         msp.add_text(label, dxfattribs={"height": 1000}).set_placement(
#             (centroid.x * SCALE_FACTOR, centroid.y * SCALE_FACTOR),
#             align=TextEntityAlignment.MIDDLE_CENTER
#         )

# doc.saveas(output_dxf)





# import sys
# import json
# import ezdxf
# from shapely.geometry import shape
# from ezdxf.enums import TextEntityAlignment

# if len(sys.argv) != 3:
#     print("Usage: python convert_to_dxf.py <geojson_file> <output_dxf>")
#     sys.exit(1)

# geojson_file = sys.argv[1]
# output_dxf = sys.argv[2]

# with open(geojson_file, 'r') as f:
#     geojson_data = json.load(f)

# doc = ezdxf.new("R12", setup=True)
# doc.header['$DWGCODEPAGE'] = 'ANSI_932'  # 日本語対応
# msp = doc.modelspace()

# # スケール係数: メートル → ミリメートル
# # SCALE_FACTOR = 1000
# SCALE_FACTOR = 1

# for feature in geojson_data['features']:
#     geom = shape(feature['geometry'])
#     if geom.geom_type == 'Polygon':
#         coords = list(geom.exterior.coords)
#         # スケール係数を適用
#         scaled_coords = [(x * SCALE_FACTOR, y * SCALE_FACTOR) for x, y in coords]
#         msp.add_polyline2d(scaled_coords + [scaled_coords[0]], dxfattribs={"closed": True})
#         centroid = geom.centroid
#         label = feature['properties'].get('地番', '')
#         # テキストの位置とサイズもスケールに合わせる
#         msp.add_text(label, dxfattribs={"height": 1000}).set_placement(
#             (centroid.x * SCALE_FACTOR, centroid.y * SCALE_FACTOR),
#             align=TextEntityAlignment.MIDDLE_CENTER
#         )

# doc.saveas(output_dxf)






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

doc = ezdxf.new("R12", setup=True)  # R12形式を維持
doc.header['$DWGCODEPAGE'] = 'ANSI_932'  # 日本語対応
msp = doc.modelspace()

for feature in geojson_data['features']:
    geom = shape(feature['geometry'])
    if geom.geom_type == 'Polygon':
        coords = list(geom.exterior.coords)
        # R12では add_polyline2d を使用し、閉じたポリラインを指定
        msp.add_polyline2d(coords + [coords[0]], dxfattribs={"closed": True})
        centroid = geom.centroid
        label = feature['properties'].get('地番', '')
        msp.add_text(label, dxfattribs={"height": 1.0}).set_placement(
            (centroid.x, centroid.y), align=TextEntityAlignment.MIDDLE_CENTER
        )

doc.saveas(output_dxf)







# import sys
# import json
# import ezdxf
# from shapely.geometry import shape
# from ezdxf.enums import TextEntityAlignment

# if len(sys.argv) != 3:
#     print("Usage: python convert_to_dxf.py <geojson_file> <output_dxf>")
#     sys.exit(1)

# geojson_file = sys.argv[1]
# output_dxf = sys.argv[2]

# with open(geojson_file, 'r') as f:
#     geojson_data = json.load(f)

# doc = ezdxf.new("R2010")
# msp = doc.modelspace()

# for feature in geojson_data['features']:
#     geom = shape(feature['geometry'])
#     if geom.geom_type == 'Polygon':
#         coords = list(geom.exterior.coords)
#         msp.add_lwpolyline(coords + [coords[0]])  # ポリゴンを描画
#         centroid = geom.centroid
#         # "地番"をラベルとして取得、デフォルトは"NoChiban"
#         label = feature['properties'].get('地番', '')
#         msp.add_text(label, dxfattribs={"height": 1.0}).set_placement(
#             (centroid.x, centroid.y), align=TextEntityAlignment.MIDDLE_CENTER
#         )

# doc.saveas(output_dxf)