import cv2
import numpy as np
import sys

# コマンドライン引数を取得
input_file = sys.argv[1]
output_file = sys.argv[2]

# 画像をグレースケールで読み込む
img = cv2.imread(input_file, cv2.IMREAD_GRAYSCALE)

# 二値化（しきい値処理）
_, binary = cv2.threshold(img, 128, 255, cv2.THRESH_BINARY_INV)

# カーネル（少し小さく）
kernel = np.ones((5,5), np.uint8)  # 5x5 に変更

# 1回だけ膨張処理を適用（少しだけ太くする）
dilated = cv2.dilate(binary, kernel, iterations=2)  # iterations=2 に変更

# 反転して元の色に戻す
dilated = cv2.bitwise_not(dilated)

# 画像を保存
cv2.imwrite(output_file, dilated)

print("Done")


# import cv2
# import numpy as np
# import sys
#
# # コマンドライン引数を取得
# input_file = sys.argv[1]
# output_file = sys.argv[2]
#
# # 画像をグレースケールで読み込む
# img = cv2.imread(input_file, cv2.IMREAD_GRAYSCALE)
#
# # 二値化（しきい値処理）
# _, binary = cv2.threshold(img, 128, 255, cv2.THRESH_BINARY_INV)
#
# # カーネル（膨張処理用フィルタ）を適切なサイズに調整
# kernel = np.ones((5,5), np.uint8)  # 5x5のカーネルでより太く
#
# # 3回膨張処理を適用（線を太くする）
# dilated = cv2.dilate(binary, kernel, iterations=3)
#
# # 反転して元の色に戻す
# dilated = cv2.bitwise_not(dilated)
#
# # 画像を保存
# cv2.imwrite(output_file, dilated)
#
# print("Done")