import sys
import json
import cv2
import numpy as np
import pytesseract
import re

def preprocess_image(image_path, scale=2):
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    height, width = image.shape[:2]
    image = cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_CUBIC)
    _, binary = cv2.threshold(image, 128, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    image = cv2.equalizeHist(image)
    image = cv2.GaussianBlur(image, (3, 3), 0)  # ノイズ除去
    return binary

def enhance_lines(binary):
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (60, 1))
    horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=3)
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 60))
    vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=3)
    return horizontal_lines, vertical_lines

def remove_lines(binary, horizontal_lines, vertical_lines):
    mask = cv2.add(horizontal_lines, vertical_lines)
    binary_no_lines = cv2.bitwise_and(binary, cv2.bitwise_not(mask))
    return binary_no_lines

def extract_text_from_image(image):
    return pytesseract.image_to_string(image, config="--oem 3 --psm 6", lang="jpn")

def correct_misrecognized_minus(text):
    return text.replace('--', '-')

# def correct_misrecognized_spaces(text):
#     """数値の間の不要なスペースを削除"""
#     # return re.sub(r'(-?\d+)\s+(\.\d+)', r'\1\2', text)
#     # return re.sub(r'(?<=\d)\s+(?=\.\d)', '', text)
#     # return re.sub(r'(?<=-?\d+)\s+(?=\.\d+)', '', text)
#     # return re.sub(r'(?<=\d)\s+(?=\.\d)', '', text)  # 数値と小数点の間のスペースのみ削除
#     # return re.sub(r'(?<=-?\d{1,6})\s+(?=\.\d+)', '', text)  # 数値と小数点の間のスペースのみ削除
#     # text = re.sub(r'(?<=-?\d{1,6})\s+(?=\.\d+)', '', text)  # 数値と小数点の間のスペースのみ削除
#     # text = re.sub(r'(?<=\d)\s+(?=\d)', '', text)  # 数値間の不要なスペースを削除
#     # return text
#     # text = re.sub(r'(?<=-?\d)\s+(?=\.\d+)', '', text)  # 小数点の前の不要なスペース削除
#     # text = re.sub(r'(?<=\d)\s+(?=\d)', '', text)  # 数値間の不要なスペースを削除
#     # return text
#     text = re.sub(r'(?<=\d{1,10})\s+(?=\.\d+)', '', text)  # 小数点の前の不要なスペース削除（固定長の look-behind）
#     text = re.sub(r'(?<=\d)\s+(?=\d)', '', text)  # 数値間の不要なスペースを削除
#     return text

def correct_misrecognized_characters(text):
    """OCR誤認識の修正（7→/ の誤認識を修正）"""
    # "7/" → "7"
    text = re.sub(r'7/', '7', text)
    # "/7" → "7"
    text = re.sub(r'/7', '7', text)

    # 残りのスラッシュを "7" に
    text = text.replace('/', '7')

    text = text.replace('ー', '-')
    text = text.replace('一', '-')

    # 指定された文字を削除
    text = re.sub(r'[|ー、。「]', '', text)
    text = text.replace('ー', '-')
    text = text.replace('一', '-')
    text = re.sub(r'[|ー、。「]', '', text)  # 指定された文字を削除
    return text

def split_text_into_2d_array(text):
    lines = text.strip().split('\n')
    result = []
    for line in lines:
        line = line.strip()
        line = re.sub(r'(-?\d+\.\d+)(-\d+\.\d+)', r'\1 \2', line)  # 数値の連続を分割
        split_line = re.split(r'\s+', line)
        result.append(split_line)
    return result

def merge_split_decimal_numbers(table):
    """ 数値のあとに . があり、次のセルが数値の場合、それらを結合する """
    merged_table = []
    for row in table:
        merged_row = []
        skip_next = False
        for i in range(len(row)):
            if skip_next:
                skip_next = False
                continue
            if i < len(row) - 1 and re.match(r'^-?\d+\.$', row[i]) and re.match(r'^\d+$', row[i + 1]):
                merged_row.append(row[i] + row[i + 1])  # 結合
                skip_next = True  # 次の要素をスキップ
            else:
                merged_row.append(row[i])
        merged_table.append(merged_row)
    return merged_table

def merge_single_characters(table):

    # '-' 一文字だけの要素を削除
    table = [[cell for cell in row if cell != '-'] for row in table]

    """ 一文字または二文字の要素の後に一文字の要素が続いた場合、それらを結合する """
    merged_table = []
    for row in table:
        merged_row = []
        skip_next = False
        for i in range(len(row)):
            if skip_next:
                skip_next = False
                continue
            if i < len(row) - 1 and len(row[i]) in [1, 2] and len(row[i + 1]) == 1:
                merged_row.append(row[i] + row[i + 1])  # 結合
                skip_next = True  # 次の要素をスキップ
            else:
                merged_row.append(row[i])
        merged_table.append(merged_row)
    return merged_table


def propagate_minus_signs(table):
    """ 前の行の同じ列にマイナスがついていたら、自己にもマイナスをつける """
    num_cols = max(len(row) for row in table if row)  # 最大列数を取得（不均一な行も処理）

    for col in range(num_cols):  # 列単位で処理
        for row in range(1, len(table)):  # 1行目から処理開始
            if col < len(table[row - 1]) and col < len(table[row]):  # 列の範囲をチェック
                prev_value = str(table[row - 1][col]).strip()
                current_value = str(table[row][col]).strip()
                
                # 可能な限り条件を緩める（マイナスで始まる、またはマイナス記号を含む）
                if ('-' in prev_value) and ('-' not in current_value):
                    table[row][col] = '-' + current_value  # マイナスを適用

    return table

def is_number(value):
    """ 文字列が小数（小数点を含む数値）かどうかを判定 """
    try:
        cleaned_value = value.replace(' ', '')  # 空白を削除
        return '.' in cleaned_value and float(cleaned_value)
    except ValueError:
        return False

def filter_numeric_rows(data):
    """ 2列目と3列目が数値の行のみを抽出 """
    filtered_data = []
    for row in data:
        if len(row) >= 3 and is_number(row[1]) and is_number(row[2]):
            filtered_data.append(row)
    return filtered_data

def extract_table_from_image(image_path):
    binary = preprocess_image(image_path)
    horizontal_lines, vertical_lines = enhance_lines(binary)
    binary_no_lines = remove_lines(binary, horizontal_lines, vertical_lines)
    raw_output = extract_text_from_image(binary_no_lines)
    corrected_text = correct_misrecognized_minus(raw_output)
    corrected_text = correct_misrecognized_characters(corrected_text)  # 7→/ の誤認識を修正
    text_2d_array = split_text_into_2d_array(corrected_text)
    merged_text_2d_array = merge_split_decimal_numbers(text_2d_array)
    fully_merged_text_2d_array = merge_single_characters(merged_text_2d_array)
    finalized_table = propagate_minus_signs(fully_merged_text_2d_array)


    # 2列目と3列目が数値の行のみを抽出
    filtered_data = filter_numeric_rows(fully_merged_text_2d_array )
    finalized_table = propagate_minus_signs(filtered_data)


    return {
        "success": True,
        "raw_output": raw_output,
        "test_data": fully_merged_text_2d_array ,
        "structured_data": filtered_data,
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
#     image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
#     height, width = image.shape[:2]
#     image = cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_CUBIC)
#     _, binary = cv2.threshold(image, 128, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
#     image = cv2.equalizeHist(image)
#     image = cv2.GaussianBlur(image, (3, 3), 0)  # ノイズ除去
#     return binary


# def enhance_lines(binary):
#     horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (60, 1))
#     horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=3)
#     vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 60))
#     vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=3)
#     return horizontal_lines, vertical_lines

# def remove_lines(binary, horizontal_lines, vertical_lines):
#     mask = cv2.add(horizontal_lines, vertical_lines)
#     binary_no_lines = cv2.bitwise_and(binary, cv2.bitwise_not(mask))
#     return binary_no_lines

# def extract_cells(binary, horizontal_lines, vertical_lines):
#     table_structure = cv2.add(horizontal_lines, vertical_lines)
#     contours, _ = cv2.findContours(table_structure, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
#     cells = [cv2.boundingRect(cnt) for cnt in contours if cv2.boundingRect(cnt)[2] > 30 and cv2.boundingRect(cnt)[3] > 20]
#     return sorted(cells, key=lambda c: (c[1] // 10, c[0]))


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
#         cleaned_value = value.replace(' ', '')  # 空白を削除
#         float(cleaned_value)
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
#     """ OCR誤認識を補正（3→5、5→3の誤認識修正） """
#     text = text.replace('５', '3').replace('３', '5')
#     text = re.sub(r'(?<!\d)-{2,}(?=\d)', '-', text)  # マイナス記号の誤認識(-- を - に変換)
#     return text

# def extract_text_from_cells(image, cells):
#     """ 各セルのOCR結果を取得 """
#     raw_output_list = []  # 生データ用リスト
    
#     for x, y, w, h in cells:
#         cell_image = image[y:y+h, x:x+w]
#         cell_image = cv2.bitwise_not(cell_image)  # 反転してOCRしやすく
#         ocr_result = pytesseract.image_to_string(cell_image, config="--oem 1 --psm 6 -c tessedit_char_whitelist=-0123456789.", lang="jpn").strip()
#         # ocr_result = pytesseract.image_to_string(cell_image, config="--oem 3 --psm 4 -c tessedit_char_whitelist=0123456789.-", lang="jpn").strip()
#                 # '-123.456-789.012' のような数値が連続する場合に分割
#         ocr_result = re.sub(r'(-?\d+\.\d+)(-\d+\.\d+)', r'\1 \2', ocr_result)
#         raw_output_list.append(ocr_result)  # 生データに追加

        

#     raw_output = "\n".join(raw_output_list)  # すべてのOCR結果を結合
#     return raw_output

# def extract_table_from_image(image_path, scale=2):
#     """ 画像から表データを抽出 """
#     binary = preprocess_image(image_path, scale)
#     horizontal_lines, vertical_lines = enhance_lines(binary)  # 罫線を強調
#     cells = extract_cells(binary, horizontal_lines, vertical_lines)  # 罫線を使ってセルを抽出
#     binary_no_lines = remove_lines(binary, horizontal_lines, vertical_lines)  # OCRのために罫線を削除
#     raw_output = extract_text_from_cells(binary_no_lines, cells)  # OCR処理

#     # 空白で区切って配列化し、数値の末尾の . を削除し、マイナス記号の誤認識(-- を - に変換)
#     # test_data = [[re.sub(r'\.$', '', re.sub(r'--', '-', item)) for item in re.split(r'\s+', line.strip())] for line in raw_output.split('\n') if line.strip()]
#     # test_data = [[re.sub(r'\.$', '', re.sub(r'(?<!\d)-{2,}(?=\d)', '-', item)) for item in re.split(r'\s+', line.strip())] for line in raw_output.split('\n') if line.strip()]

#     """ OCR誤認識による '--' を '-' に修正 """
#     test_data = raw_output.replace('--', '-')

#     """ 空白区切りで文字列を二次元配列に変換（数値が繋がっている場合も分割） """
#     lines = test_data.strip().split('\n')
#     result = []
#     for line in lines:
#         line = line.strip()
#         # 数値が連続している部分を分割
#         line = re.sub(r'(-?\d+\.\d+)(-\d+\.\d+)', r'\1 \2', line)
#         split_line = re.split(r'\s+', line)
#         result.append(split_line)
#     test_datas = result
   
#     # 2列目と3列目が数値の行のみを抽出
#     filtered_data = filter_numeric_rows(test_datas)

#     # 一行目の2列目をchiban_dataとして取得
#     chiban_data = test_datas[0][2] if len(test_datas) > 0 and len(test_datas[0]) > 1 else ""

#     return {
#         "success": True,
#         "structured_data": filtered_data,
#         "raw_output": raw_output,
#         "chiban_data": chiban_data,
#         "test_data": test_datas
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
