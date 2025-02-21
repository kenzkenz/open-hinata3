import sys
import json
import cv2
import numpy as np
import pytesseract
import re

def preprocess_image(image_path):
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    _, binary = cv2.threshold(image, 128, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    detected_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
    binary = cv2.subtract(binary, detected_lines)
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
    detected_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
    binary = cv2.subtract(binary, detected_lines)
    temp_path = "/tmp/processed_image.png"
    cv2.imwrite(temp_path, binary)
    return temp_path

def correct_six_misrecognition(text):
    corrected_text = re.sub(r'(?<=\d)e(?=\d)', '6', text)
    corrected_text = re.sub(r'-e', '-6', corrected_text)
    corrected_text = corrected_text.replace('ー', '-')  # OCRの'ー'を'-'に変換
    corrected_text = re.sub(r'(?<=\d)z(?=\d)', '2', corrected_text)  # 数値に挟まれた'z'を'2'に変換
    return corrected_text

def clean_numeric(cell):
    return re.sub(r'[^0-9\.-]', '', cell)

def merge_split_numbers(cells):
    """
    -69022. 285 のように、数値が分割されている場合に結合する。
    """
    merged_cells = []
    i = 0
    while i < len(cells):
        if i < len(cells) - 1 and re.match(r'-?\d+\.$', cells[i]) and re.match(r'\d+', cells[i + 1]):
            merged_cells.append(cells[i] + cells[i + 1])
            i += 2
        else:
            merged_cells.append(cells[i])
            i += 1
    return merged_cells

def extract_text_from_image(image_path):
    processed_image = preprocess_image(image_path)
    if processed_image is None:
        return {"success": False, "error": "Failed to process image"}
    
    ocr_result = pytesseract.image_to_string(processed_image, config="--oem 1 --psm 6", lang="jpn")
    ocr_text = correct_six_misrecognition(ocr_result.strip().replace('|', ''))
    
    lines = [line for line in ocr_text.split('\n') if line]
    structured_data = []
    
    for line in lines:
        cells = line.split()
        cleaned_cells = [clean_numeric(cell) for cell in cells if clean_numeric(cell)]
        merged_cells = merge_split_numbers(cleaned_cells)
        
        col1 = next((cell for cell in cells if not re.match(r'-?\d+\.\d+', cell)), '9')
        col2, col3 = None, None
        
        for cell in merged_cells:
            if len(cell) >= 5 and re.match(r'-?\d+\.\d+', cell):  # 5桁以上の数値、小数点を考慮
                if col2 is None:
                    col2 = cell
                elif col3 is None:
                    col3 = cell
                else:
                    break
        
        if col2 and col3:  # 両方セットできた行のみを出力
            structured_data.append([
                col1,
                col2,
                col3
            ])
    
    return {"success": True, "raw_output": ocr_text, "structured_data": structured_data}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Missing image path"}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    result = extract_text_from_image(image_path)
    print(json.dumps(result, ensure_ascii=False, indent=2))


# import sys
# import json
# import cv2
# import numpy as np
# import pytesseract
# import re

# def add_left_margin(image_path, margin=20):
#     image = cv2.imread(image_path)
#     height, width = image.shape[:2]

#     # 左側に白い余白を追加
#     new_width = width + margin
#     white_background = np.ones((height, new_width, 3), dtype=np.uint8) * 255
#     white_background[:, margin:] = image

#     temp_path = "/tmp/image_with_margin.png"
#     cv2.imwrite(temp_path, white_background)
#     return temp_path

# def remove_lines(image_path):
#     image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
#     _, binary = cv2.threshold(image, 128, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

#     # 水平線除去
#     horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
#     detected_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
#     binary = cv2.subtract(binary, detected_lines)

#     # 垂直線除去
#     vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
#     detected_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
#     binary = cv2.subtract(binary, detected_lines)

#     temp_path = "/tmp/image_without_lines.png"
#     cv2.imwrite(temp_path, binary)
#     return temp_path

# def upscale_image(image_path, scale=2):
#     image = cv2.imread(image_path)
#     height, width = image.shape[:2]

#     # 2倍に拡大
#     resized = cv2.resize(image, (width * scale, height * scale), interpolation=cv2.INTER_CUBIC)

#     temp_path = "/tmp/upscaled_image.png"
#     cv2.imwrite(temp_path, resized)
#     return temp_path

# def preprocess_image(image_path):
#     image_path = add_left_margin(image_path)
#     image_path = remove_lines(image_path)
#     image_path = upscale_image(image_path)
#     return image_path

# def correct_six_misrecognition(text):
#     """
#     OCRの誤認識で '6' が 'e' になっているケースを修正する。
#     - 'e' が数値の間にある場合（例: '5e7' → '567'）
#     - '-e' が '-6' になっている場合
#     - 単独の 'e' で数値の周囲にある場合
#     """
#     corrected_text = re.sub(r'(?<=\d)e(?=\d)', '6', text)  # 数字に挟まれた 'e' を '6' に変換
#     corrected_text = re.sub(r'-e', '-6', corrected_text)  # '-e' を '-6' に変換
#     return corrected_text

# def merge_cells(cells):
#     """
#     セルリスト中、前のセルが'.'で終わり、次のセルが存在し数字のみの場合に連結する。
#     例: ['-69022.', '199'] -> ['-69022.199']
#     """
#     merged = []
#     i = 0
#     while i < len(cells):
#         if cells[i].endswith('.') and (i + 1) < len(cells) and cells[i+1].isdigit():
#             merged.append(cells[i] + cells[i+1])
#             i += 2
#         else:
#             merged.append(cells[i])
#             i += 1
#     return merged

# def clean_numeric(cell):
#     """
#     数値として扱うべきセルから、数字、ピリオド、マイナス記号以外の文字を削除する。
#     """
#     return re.sub(r'[^0-9\.\-]', '', cell)

# def is_number(value):
#     """
#     valueが数値に変換可能かどうかを判定する。
#     """
#     try:
#         float(value)
#         return True
#     except ValueError:
#         return False

# def extract_text_from_image(image_path):
#     processed_image = preprocess_image(image_path)
#     if processed_image is None:
#         return {"success": False, "error": "Failed to process image"}

#     # OCR実行
#     ocr_result = pytesseract.image_to_string(processed_image, config="--oem 1 --psm 6", lang="jpn")

#     # "|" を削除し、OCRの '6' → 'e' 誤認識を修正
#     ocr_text = correct_six_misrecognition(ocr_result.strip().replace('|', ''))

#     # 改行で各行を抽出し、各行を空白でセルに分割する
#     lines = [line for line in ocr_text.split('\n') if line]
#     structured_data = []
#     for line in lines:
#         cells = line.split()
#         merged_cells = merge_cells(cells)
#         # 2列目、3列目、4列目（インデックス 1,2,3）は数値として扱うので、数字以外の文字を削除
#         for i in [1, 2, 3]:
#             if i < len(merged_cells):
#                 merged_cells[i] = clean_numeric(merged_cells[i])
#         structured_data.append(merged_cells)

#     # 2列目、3列目、4列目が全て数値の行だけを抽出
#     filtered_data = []
#     for row in structured_data:
#         if len(row) >= 4 and all(is_number(row[i]) for i in [1,2,3]):
#             filtered_data.append(row)

#     return {"success": True, "raw_output": ocr_text, "structured_data": filtered_data}

# if __name__ == "__main__":
#     if len(sys.argv) < 2:
#         print(json.dumps({"success": False, "error": "Missing image path"}))
#         sys.exit(1)

#     image_path = sys.argv[1]
#     result = extract_text_from_image(image_path)
#     print(json.dumps(result))
