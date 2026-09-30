import cv2
import os
import uuid

ANC_PATH = os.path.join("data", "anchor")
POS_PATH = os.path.join("data", "positive")

os.makedirs(ANC_PATH, exist_ok=True)
os.makedirs(POS_PATH, exist_ok=True)

cap = cv2.VideoCapture(1, cv2.CAP_AVFOUNDATION)

if not cap.isOpened():
    print("Could not open camera")
    exit()
    
cv2.namedWindow("Image Collection", cv2.WINDOW_AUTOSIZE)
while True:
    ret, frame = cap.read()

    if not ret:
        print("Could not read frame")
        break

    
    frame = cv2.flip(frame, 1)
    display_frame = cv2.resize(frame, (640, 480))
    cv2.imshow("Image Collection", display_frame)

    key = cv2.waitKey(1) & 0xFF

    if key == ord("a"):
        filename = os.path.join(
            ANC_PATH,
            f"{uuid.uuid4()}.jpg"
        )

        cv2.imwrite(filename, display_frame)
        print("Saved anchor")

    elif key == ord("p"):
        filename = os.path.join(
            POS_PATH,
            f"{uuid.uuid4()}.jpg"
        )

        cv2.imwrite(filename, display_frame)
        print("Saved positive")

    elif key == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()