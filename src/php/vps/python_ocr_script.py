import sys
import json
import cv2
import numpy as np
import pytesseract
import re


def preprocess_image(image_path):
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    _, binary = cv2.threshold(image, 128, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # コントラスト強調
    image = cv2.equalizeHist(image)
    
    # ガウシアンブラーでノイズ除去
    image = cv2.GaussianBlur(image, (3, 3), 0)

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
    
    ocr_result = pytesseract.image_to_string(processed_image, config="--oem 1 --psm 6 --dpi 1000", lang="jpn")
    ocr_text = correct_six_misrecognition(ocr_result.strip().replace('|', ''))
    
    lines = [line for line in ocr_text.split('\n') if line]
    structured_data = []
    chiban_data = ""

    if lines:
        first_line_words = lines[0].split()
        if first_line_words:
            chiban_data = first_line_words[-1]  # 最後の単語を抽出
    
    for line in lines:
        cells = line.split()
        cleaned_cells = [clean_numeric(cell) for cell in cells if clean_numeric(cell)]
        merged_cells = merge_split_numbers(cleaned_cells)
        
        col1 = next((cell for cell in cells if not re.match(r'-?\d+\.\d+', cell)), '9')
        col2, col3, col4 = None, None, None
        
        for cell in merged_cells:
            if len(cell) >= 5 and re.match(r'-?\d+\.\d+', cell):  # 5桁以上の数値、小数点を考慮
                if col2 is None:
                    col2 = cell
                elif col3 is None:
                    col3 = cell
                elif col4 is None:
                    col4 = cell
                    break
        
        if col2 and col3 and col4:  # 3つの数値がそろった行のみを出力
            structured_data.append([
                col1,
                col2,
                col3,
                col4
            ])
    
    return {"success": True, "raw_output": ocr_text, "structured_data": structured_data, "chiban_data": chiban_data}

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


# def preprocess_image(image_path):
#     image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
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

# def extract_text_from_image(image_path):
#     processed_image = preprocess_image(image_path)
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
#         col2, col3 = None, None
        
#         for cell in merged_cells:
#             if len(cell) >= 5 and re.match(r'-?\d+\.\d+', cell):  # 5桁以上の数値、小数点を考慮
#                 if col2 is None:
#                     col2 = cell
#                 elif col3 is None:
#                     col3 = cell
#                 else:
#                     break
        
#         if col2 and col3:  # 両方セットできた行のみを出力
#             structured_data.append([
#                 col1,
#                 col2,
#                 col3
#             ])
    
#     return {"success": True, "raw_output": ocr_text, "structured_data": structured_data, "chiban_data": chiban_data}

# if __name__ == "__main__":
#     if len(sys.argv) < 2:
#         print(json.dumps({"success": False, "error": "Missing image path"}))
#         sys.exit(1)
    
#     image_path = sys.argv[1]
#     result = extract_text_from_image(image_path)
#     print(json.dumps(result, ensure_ascii=False, indent=2))

