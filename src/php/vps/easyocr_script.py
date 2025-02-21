# easyocr_script.py
import sys
import json
import easyocr

def perform_ocr(image_path):
    reader = easyocr.Reader(['ja', 'en'])  # 日本語＆英語対応
    results = reader.readtext(image_path)

    extracted_text = []
    for text_info in results:
        extracted_text.append(text_info[1])  # 認識テキストを追加

    return json.dumps({"text": "\n".join(extracted_text)})

if __name__ == "__main__":
    image_path = sys.argv[1]
    print(perform_ocr(image_path))
