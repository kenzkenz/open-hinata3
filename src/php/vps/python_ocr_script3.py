import sys
import json
import cv2
import numpy as np
import pytesseract
import re

def preprocess_image(image_path, scale=2):
    """ 画像の前処理（グレースケール変換、二値化、ノイズ除去） """
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    
    # 拡大処理
    height, width = image.shape[:2]
    image = cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_CUBIC)

    _, binary = cv2.threshold(image, 128, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # コントラスト強調
    image = cv2.equalizeHist(image)

   # ガウシアンブラーでノイズ除去
    image = cv2.GaussianBlur(image, (3, 3), 0)

    # 二値化（適応的閾値処理）
    # binary = cv2.adaptiveThreshold(image, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 15, 10)

    return binary


def enhance_lines(binary):
    """ 罫線を強調する処理 """
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (60, 1))
    horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=3)
    horizontal_lines = cv2.dilate(horizontal_lines, horizontal_kernel, iterations=2)

    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 60))
    vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=3)
    vertical_lines = cv2.dilate(vertical_lines, vertical_kernel, iterations=2)

    return horizontal_lines, vertical_lines

def remove_lines(binary, horizontal_lines, vertical_lines):
    """ 罫線を削除し、OCR用の画像を作成 """
    mask = cv2.add(horizontal_lines, vertical_lines)  # 水平線と垂直線を合成
    binary_no_lines = cv2.bitwise_and(binary, cv2.bitwise_not(mask))
    return binary_no_lines

def extract_cells(binary, horizontal_lines, vertical_lines):
    """ 罫線からセルを抽出する """
    table_structure = cv2.add(horizontal_lines, vertical_lines)
    contours, _ = cv2.findContours(table_structure, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    cells = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w > 30 and h > 20:  # 小さすぎる領域は無視
            cells.append((x, y, w, h))

    # 上から順にソート（行単位でグループ化）
    cells = sorted(cells, key=lambda c: (c[1] // 10, c[0]))  # `// 10` で近い値をまとめる

    return cells
    
def is_number(value):
    """ 文字列が数値（整数または小数）かどうかを判定 """
    try:
        cleaned_value = value.replace(' ', '')  # 空白を削除
        float(cleaned_value)
        return True
    except ValueError:
        return False

def filter_numeric_rows(data):
    """ 2列目と3列目が数値の行のみを抽出 """
    filtered_data = []
    for row in data:
        if len(row) >= 3 and is_number(row[1]) and is_number(row[2]):
            filtered_data.append(row)
    return filtered_data

def correct_misrecognized_numbers(text):
    """ OCR誤認識を補正 """
    corrected_text = text.replace('!', '|').replace('｜', '|').replace(' ', '')  # 罫線文字の修正とスペース削除
    # corrected_text = re.sub(r'(?<=\d)e(?=\d)', '6', text)
    corrected_text = re.sub(r'(?<=\d)\s(?=\d)', '', corrected_text)  # 数字間のスペース削除
    corrected_text = corrected_text.replace('ー', '-').replace('一', '-').replace('−', '-')  # さまざまなマイナス記号を統一
    # corrected_text = re.sub(r'(?<=\d)8(?=\d)', '8', corrected_text)  # `8` の誤認識を補正
    corrected_text = re.sub(r'(?<=\d)0(?=\d{2,})', '0', corrected_text)  # `0` の誤変換を防ぐ

    return text

def extract_text_from_cells(image, cells):
    """ 各セルのOCR結果を取得 """
    """ 各セルのOCR結果を取得（1段階目のみ） """
    structured_data = []
    row = []
    last_y = None
    raw_output_list = []  # 生データ用リスト
    first_stage_data = []  # 1段階目のデータのみ保持
    
    for x, y, w, h in cells:
        if last_y is not None and abs(y - last_y) > 20:
            first_stage_data.append(row)  # 1段階目のデータを保存
            row = []

        cell_image = image[y:y+h, x:x+w]
        cell_image = cv2.bitwise_not(cell_image)  # 反転してOCRしやすく
        ocr_result = pytesseract.image_to_string(cell_image, config="--oem 1 --psm 6 -c tessedit_char_whitelist=-0123456789.", lang="jpn").strip()
        row.append(ocr_result)  # OCR結果をそのまま追加
        raw_output_list.append(ocr_result)  # 生データに追加
        last_y = y

    if row:
        first_stage_data.append(row)  # 1段階目のデータを保存

    raw_output = "\n".join(raw_output_list)  # すべてのOCR結果を結合
    
    return first_stage_data, raw_output  # 1段階目のデータのみ返す

def extract_table_from_image(image_path, scale=2):
    """ 画像から表データを抽出 """
    binary = preprocess_image(image_path, scale)
    horizontal_lines, vertical_lines = enhance_lines(binary)  # 罫線を強調
    cells = extract_cells(binary, horizontal_lines, vertical_lines)  # 罫線を使ってセルを抽出
    binary_no_lines = remove_lines(binary, horizontal_lines, vertical_lines)  # OCRのために罫線を削除
    extracted_text, raw_output = extract_text_from_cells(binary_no_lines, cells)  # OCR処理




    # 空白で区切って配列化し、数値の末尾の . を削除し、マイナス記号の誤認識(-- を - に変換)
    test_data = [[re.sub(r'\.$', '', re.sub(r'--', '-', item)) for item in re.split(r'\s+', line.strip())] for line in raw_output.split('\n') if line.strip()]
   
    # 2列目と3列目が数値の行のみを抽出
    filtered_data = filter_numeric_rows(test_data)

    # 一行目の2列目をchiban_dataとして取得
    chiban_data = extracted_text[0][2] if len(extracted_text) > 0 and len(extracted_text[0]) > 1 else ""

    return {
        "success": True,
        "structured_data": filtered_data,
        "raw_output": raw_output,
        "chiban_data": chiban_data,
        "test_data": test_data
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Missing image path"}))
        sys.exit(1)

    image_path = sys.argv[1]
    result = extract_table_from_image(image_path)
    print(json.dumps(result, ensure_ascii=False, indent=2))



# import sys
# import json
# import cv2
# import numpy as np
# import pytesseract
# import re

# def preprocess_image(image_path, scale=2):
#     """ 画像の前処理（グレースケール変換、二値化、ノイズ除去） """
#     image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    
#     # 拡大処理
#     height, width = image.shape[:2]
#     image = cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_CUBIC)

#     # 二値化（適応的閾値処理）
#     binary = cv2.adaptiveThreshold(image, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 15, 10)

#     return binary

# def enhance_lines(binary):
#     """ 罫線を強調する処理 """
#     horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
#     horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
#     horizontal_lines = cv2.dilate(horizontal_lines, horizontal_kernel, iterations=1)

#     vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
#     vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
#     vertical_lines = cv2.dilate(vertical_lines, vertical_kernel, iterations=1)

#     return horizontal_lines, vertical_lines

# def remove_lines(binary, horizontal_lines, vertical_lines):
#     """ 罫線を削除し、OCR用の画像を作成 """
#     mask = cv2.add(horizontal_lines, vertical_lines)  # 水平線と垂直線を合成
#     binary_no_lines = cv2.bitwise_and(binary, cv2.bitwise_not(mask))
#     return binary_no_lines

# def extract_cells(binary, horizontal_lines, vertical_lines):
#     """ 罫線からセルを抽出する """
#     table_structure = cv2.add(horizontal_lines, vertical_lines)
#     contours, _ = cv2.findContours(table_structure, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

#     cells = []
#     for cnt in contours:
#         x, y, w, h = cv2.boundingRect(cnt)
#         if w > 30 and h > 20:  # 小さすぎる領域は無視
#             cells.append((x, y, w, h))

#     # 上から順にソート（行単位でグループ化）
#     cells = sorted(cells, key=lambda c: (c[1] // 10, c[0]))  # `// 10` で近い値をまとめる

#     return cells

# def is_number(value):
#     """ 文字列が数値（整数または小数）かどうかを判定 """
#     try:
#         float(value)
#         return True
#     except ValueError:
#         return False

# def filter_numeric_rows(data):
#     """ 2列目と3列目が数値の行のみを抽出 """
#     filtered_data = []
#     for row in data:
#         if len(row) >= 3 and is_number(row[1]) and is_number(row[2]):
#             filtered_data.append(row)
#     return filtered_data

# def correct_misrecognized_numbers(text):
#     """ OCR誤認識を補正 """
#     corrected_text = re.sub(r'(?<=\d)e(?=\d)', '6', text)
#     corrected_text = corrected_text.replace('ー', '-')
#     corrected_text = corrected_text.replace('一', '-')
#     return corrected_text

# def extract_text_from_cells(image, cells):
#     """ 各セルのOCR結果を取得 """
#     structured_data = []
#     row = []
#     last_y = None
#     raw_output_list = []  # 生データ用リスト
    
#     for x, y, w, h in cells:
#         if last_y is not None and abs(y - last_y) > 20:
#             structured_data.append(row)
#             row = []

#         cell_image = image[y:y+h, x:x+w]
#         cell_image = cv2.bitwise_not(cell_image)  # 反転してOCRしやすく
#         ocr_result = pytesseract.image_to_string(cell_image, config="--oem 1 --psm 6", lang="jpn").strip()
#         corrected_text = correct_misrecognized_numbers(ocr_result)

#         row.append(corrected_text)
#         raw_output_list.append(ocr_result)  # 生データに追加
#         last_y = y

#     if row:
#         structured_data.append(row)

#     raw_output = "\n".join(raw_output_list)  # すべてのOCR結果を結合
#     return structured_data, raw_output

# def extract_table_from_image(image_path, scale=2):
#     """ 画像から表データを抽出 """
#     binary = preprocess_image(image_path, scale)
#     horizontal_lines, vertical_lines = enhance_lines(binary)
#     binary_no_lines = remove_lines(binary, horizontal_lines, vertical_lines)
#     cells = extract_cells(binary, horizontal_lines, vertical_lines)

#     extracted_text, raw_output = extract_text_from_cells(binary_no_lines, cells)

#     # 2列目と3列目が数値の行のみを抽出
#     filtered_data = filter_numeric_rows(extracted_text)

#     return {
#         "success": True,
#         "structured_data": filtered_data,
#         "raw_output": raw_output
#     }

# if __name__ == "__main__":
#     if len(sys.argv) < 2:
#         print(json.dumps({"success": False, "error": "Missing image path"}))
#         sys.exit(1)

#     image_path = sys.argv[1]
#     result = extract_table_from_image(image_path)
#     print(json.dumps(result, ensure_ascii=False, indent=2))








# import sys
# import json
# import cv2
# import numpy as np
# import pytesseract
# import re

# def preprocess_image(image_path,scale):
#     image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
#         # 画像を2倍に拡大
#     height, width = image.shape[:2]
#     image = cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_CUBIC)
    
#     _, binary = cv2.threshold(image, 128, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

#     # コントラスト強調
#     image = cv2.equalizeHist(image)
    
#     # ガウシアンブラーでノイズ除去
#     image = cv2.GaussianBlur(image, (3, 3), 0)

#     horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
#     detected_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
#     binary = cv2.subtract(binary, detected_lines)
#     vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
#     detected_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
#     binary = cv2.subtract(binary, detected_lines)
#     temp_path = "/tmp/processed_image.png"
#     cv2.imwrite(temp_path, binary)
#     return temp_path

# def correct_six_misrecognition(text):
#     corrected_text = re.sub(r'(?<=\d)e(?=\d)', '6', text)
#     corrected_text = re.sub(r'-e', '-6', corrected_text)
#     corrected_text = corrected_text.replace('ー', '-')  # OCRの'ー'を'-'に変換
#     corrected_text = re.sub(r'(?<=\d)z(?=\d)', '2', corrected_text)  # 数値に挟まれた'z'を'2'に変換
#     return corrected_text

# def clean_numeric(cell):
#     return re.sub(r'[^0-9\.-]', '', cell)

# def merge_split_numbers(cells):
#     """
#     -69022. 285 のように、数値が分割されている場合に結合する。
#     """
#     merged_cells = []
#     i = 0
#     while i < len(cells):
#         if i < len(cells) - 1 and re.match(r'-?\d+\.$', cells[i]) and re.match(r'\d+', cells[i + 1]):
#             merged_cells.append(cells[i] + cells[i + 1])
#             i += 2
#         else:
#             merged_cells.append(cells[i])
#             i += 1
#     return merged_cells

# def extract_text_from_image(image_path, scale):
#     processed_image = preprocess_image(image_path, scale)
#     if processed_image is None:
#         return {"success": False, "error": "Failed to process image"}
    
#     ocr_result = pytesseract.image_to_string(processed_image, config="--oem 1 --psm 6 --dpi 1000", lang="jpn")
#     ocr_text = correct_six_misrecognition(ocr_result.strip().replace('|', ''))
    
#     lines = [line for line in ocr_text.split('\n') if line]
#     structured_data = []
#     chiban_data = ""

#     if lines:
#         first_line_words = lines[0].split()
#         if first_line_words:
#             chiban_data = first_line_words[-1]  # 最後の単語を抽出
    
#     for line in lines:
#         cells = line.split()
#         cleaned_cells = [clean_numeric(cell) for cell in cells if clean_numeric(cell)]
#         merged_cells = merge_split_numbers(cleaned_cells)
        
#         col1 = next((cell for cell in cells if not re.match(r'-?\d+\.\d+', cell)), '9')
#         col2, col3, col4 = None, None, None
        
#         for cell in merged_cells:
#             if len(cell) >= 5 and re.match(r'-?\d+\.\d+', cell):  # 5桁以上の数値、小数点を考慮
#                 if col2 is None:
#                     col2 = cell
#                 elif col3 is None:
#                     col3 = cell
#                 elif col4 is None:
#                     col4 = cell
#                     break
        
#         if col2 and col3 and col4:  # 3つの数値がそろった行のみを出力
#             structured_data.append([
#                 col1,
#                 col2,
#                 col3,
#                 col4
#             ])
    
#     return {"success": True, "raw_output": ocr_text, "structured_data": structured_data, "chiban_data": chiban_data}

# if __name__ == "__main__":
#     if len(sys.argv) < 3:
#         print(json.dumps({"success": False, "error": "Missing arguments. Usage: script.py <image_path> <scale>"}))
#         sys.exit(1)
    
#     image_path = sys.argv[1]
#     scale = float(sys.argv[2])
#     result = extract_text_from_image(image_path, scale)
#     print(json.dumps(result, ensure_ascii=False, indent=2))
