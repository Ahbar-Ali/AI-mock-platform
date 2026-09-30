import tensorflow as tf

def preprocess(file_path):
    byte_img = tf.io.read_file(file_path) ## reads the byte contents(self notes)
    img = tf.io.decode_jpeg(byte_img, channels=3) ## turns to pixels
    img = tf.image.resize(img, (100, 100)) ## 100 wide × 100 tall × 3 colors all 
    img = img / 255.0 ## change pixel values from 0.0 → 1.0
    return img
