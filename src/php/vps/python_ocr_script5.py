import cv2
import numpy as np
import pytesseract
import matplotlib.pyplot as plt
import re
import json
import sys

def preprocess_image(image_path, scale=2):
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    height, width = image.shape[:2]
    image = cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_CUBIC)
    _, binary = cv2.threshold(image, 128, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    image = cv2.equalizeHist(image)
    image = cv2.GaussianBlur(image, (3, 3), 0)  # ノイズ除去
    return binary


def preprocess_image2(image):
    _, binary = cv2.threshold(image, 128, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    return binary

def detect_tables(image):
    binary = preprocess_image2(image)
    
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
    
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
    vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
    
    table_mask = cv2.add(horizontal_lines, vertical_lines)
    
    contours, _ = cv2.findContours(table_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    table_boxes = [cv2.boundingRect(cnt) for cnt in contours]
    
    return sorted(table_boxes, key=lambda x: (x[1], x[0]))

def draw_table_boxes(image, table_boxes):
    image_color = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    for (x, y, w, h) in table_boxes:
        cv2.rectangle(image_color, (x, y), (x + w, y + h), (0, 255, 0), 2)
    plt.figure(figsize=(12, 8))
    plt.imshow(image_color, cmap='gray')
    plt.title("Detected Tables")
    plt.axis("off")
    plt.show()

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
    # return pytesseract.image_to_string(image, config="--psm 6 -l jpn+eng")

def correct_misrecognized_minus(text):
    return text.replace('--', '-')

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
    text = text.replace('—', '-')

    # 連続したマイナス(--)以上を単一のマイナス(-)に修正
    text = re.sub(r'-{2,}', '-', text)


    text = text.replace('|', ' ')
    text = text.replace('!', ' ')
    text = text.replace('j', ' ')
    text = text.replace("'", ' ')
    text = text.replace("'", ' ')
    text = text.replace("11", ' ')

    # 指定された文字を削除
    text = re.sub(r'[|ー、。「]', '', text)
    text = text.replace('ー', '-')
    text = text.replace('一', '-')
    text = re.sub(r'[|ー、。「」=]', '', text)  # 指定された文字を削除

    # 単語の最終文字が ',' の場合は空白三つに置き換え (例: "hoge." → "hoge   ")
    text = re.sub(r'(\S+)\,(?=\s|$)', r'\1   ', text)

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

    def is_number(val):
        """数値判定（整数・小数など）"""
        try:
            float(val)
            return True
        except ValueError:
            return False

    if not table or not table[0]:
        return table

    num_cols = max(len(row) for row in table if row)

    for col in range(num_cols):
        for row in range(1, len(table)):
            if col < len(table[row - 1]) and col < len(table[row]):
                prev_value = str(table[row - 1][col]).strip()
                current_value = str(table[row][col]).strip()

                # 前の行と現在の行が数値であり、前の行には '-' が含まれ、現在は含まれない
                if is_number(prev_value) and is_number(current_value) and ('-' in prev_value) and ('-' not in current_value):
                    table[row][col] = '-' + current_value

    return table

def remove_trailing_dot(table):
    """ 配列生成後に、要素の最後が '.' だった場合に削除する """
    for row_index, row in enumerate(table):
        for col_index, value in enumerate(row):
            if value.endswith('.'):
                # 最後が '.' だけの場合、削除
                table[row_index][col_index] = value[:-1]
    return table

def remove_underscore_element(table):
    """ 配列生成後に、要素が '_' 一文字だけの場合削除 """
    cleaned_table = []
    for row in table:
        # '_' のみの要素を削除
        cleaned_row = [cell for cell in row if cell != '_']
        cleaned_table.append(cleaned_row)
    return cleaned_table

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
        # if len(row) >= 3 and is_number(row[1]) and is_number(row[2]):            
        if len(row) >= 4 and is_number(row[1]) and is_number(row[2]) and is_number(row[3]):
            filtered_data.append(row)
    return filtered_data

def extract_table_from_image(image_path):

    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    table_boxes = detect_tables(image)
    draw_table_boxes(image, table_boxes)

    ocr_results = {}
    for i, (x, y, w, h) in enumerate(table_boxes):
        table_image = image[y:y+h, x:x+w]
        binary = preprocess_image(image_path)
        horizontal_lines, vertical_lines = enhance_lines(binary)
        binary_no_lines = remove_lines(binary, horizontal_lines, vertical_lines)

        raw_output = extract_text_from_image(binary_no_lines)
        # raw_output = extract_text_from_image(table_image)
        # raw_output = pytesseract.image_to_string(table_image, config="--psm 6 -l jpn+eng")


        
        corrected_text = correct_misrecognized_minus(raw_output)
        corrected_text = correct_misrecognized_characters(corrected_text)  # 7→/ の誤認識を修正
        text_2d_array = split_text_into_2d_array(corrected_text)
        merged_text_2d_array = merge_split_decimal_numbers(text_2d_array)
        fully_merged_text_2d_array = merge_single_characters(merged_text_2d_array)
        finalized_table = propagate_minus_signs(fully_merged_text_2d_array)    
        finalized_table = remove_trailing_dot(finalized_table)
        finalized_table = remove_underscore_element(finalized_table)
        # 2列目と3列目が数値の行のみを抽出
        filtered_data = filter_numeric_rows(finalized_table)
        finalized_table = propagate_minus_signs(filtered_data)

        ocr_results[f"Table_{i+1}"] = {
            "raw_output": raw_output,
            "test_data": fully_merged_text_2d_array,
            "structured_data": filtered_data
        }

    return {
        "success": True,
        "raw_output": raw_output,
        "test_data": fully_merged_text_2d_array ,
        "structured_data": filtered_data,
        "tables": ocr_results
    }
    

        

    # binary = preprocess_image(image_path)
    # horizontal_lines, vertical_lines = enhance_lines(binary)
    # binary_no_lines = remove_lines(binary, horizontal_lines, vertical_lines)
    # raw_output = extract_text_from_image(binary_no_lines)
    # corrected_text = correct_misrecognized_minus(raw_output)
    # corrected_text = correct_misrecognized_characters(corrected_text)  # 7→/ の誤認識を修正
    # text_2d_array = split_text_into_2d_array(corrected_text)
    # merged_text_2d_array = merge_split_decimal_numbers(text_2d_array)
    # fully_merged_text_2d_array = merge_single_characters(merged_text_2d_array)
    # finalized_table = propagate_minus_signs(fully_merged_text_2d_array)    
    # finalized_table = remove_trailing_dot(finalized_table)
    # finalized_table = remove_underscore_element(finalized_table)
    # # 2列目と3列目が数値の行のみを抽出
    # filtered_data = filter_numeric_rows(finalized_table)
    # finalized_table = propagate_minus_signs(filtered_data)

    # return {
    #     "success": True,
    #     "raw_output": raw_output,
    #     "test_data": fully_merged_text_2d_array ,
    #     "structured_data": filtered_data,
    # }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Missing image path"}))
        sys.exit(1)

    image_path = sys.argv[1]
    result = extract_table_from_image(image_path)
    print(json.dumps(result, ensure_ascii=False, indent=2))
