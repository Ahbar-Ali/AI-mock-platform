import os
import random
import tensorflow as tf

from preprocessing import preprocess


ANC_PATH = os.path.join("data", "anchor")
POS_PATH = os.path.join("data", "positive")
NEG_PATH = os.path.join("data", "negative")

SEED = 42
random.seed(SEED)


def get_jpg_files(folder):
    return [
        os.path.join(folder, filename)
        for filename in os.listdir(folder)
        if filename.lower().endswith(".jpg")
    ]


# Get image paths

anchor_files = get_jpg_files(ANC_PATH)
positive_files = get_jpg_files(POS_PATH)
negative_files = get_jpg_files(NEG_PATH)

# Shuffle BEFORE splitting
random.shuffle(anchor_files)
random.shuffle(positive_files)
random.shuffle(negative_files)


# Split actual images into train/test

anchor_split = int(len(anchor_files) * 0.7)
positive_split = int(len(positive_files) * 0.7)

train_anchor = anchor_files[:anchor_split]
test_anchor = anchor_files[anchor_split:]

train_positive = positive_files[:positive_split]
test_positive = positive_files[positive_split:]


# We only need enough negatives to match our anchor counts
train_negative = negative_files[:len(train_anchor)]

test_negative = negative_files[
    len(train_anchor):
    len(train_anchor) + len(test_anchor)
]



# Make sure pair counts match
train_count = min(
    len(train_anchor),
    len(train_positive),
    len(train_negative)
)

test_count = min(
    len(test_anchor),
    len(test_positive),
    len(test_negative)
)

train_anchor = train_anchor[:train_count]
train_positive = train_positive[:train_count]
train_negative = train_negative[:train_count]

test_anchor = test_anchor[:test_count]
test_positive = test_positive[:test_count]
test_negative = test_negative[:test_count]



# Convert paths into TensorFlow datasets
train_anchor_ds = tf.data.Dataset.from_tensor_slices(train_anchor)
train_positive_ds = tf.data.Dataset.from_tensor_slices(train_positive)
train_negative_ds = tf.data.Dataset.from_tensor_slices(train_negative)

test_anchor_ds = tf.data.Dataset.from_tensor_slices(test_anchor)
test_positive_ds = tf.data.Dataset.from_tensor_slices(test_positive)
test_negative_ds = tf.data.Dataset.from_tensor_slices(test_negative)


#Create positive and negative pairs
train_positives = tf.data.Dataset.zip((
    train_anchor_ds,
    train_positive_ds,
    tf.data.Dataset.from_tensor_slices(
        tf.ones(train_count)
    )
))

train_negatives = tf.data.Dataset.zip((
    train_anchor_ds,
    train_negative_ds,
    tf.data.Dataset.from_tensor_slices(
        tf.zeros(train_count)
    )
))

test_positives = tf.data.Dataset.zip((
    test_anchor_ds,
    test_positive_ds,
    tf.data.Dataset.from_tensor_slices(
        tf.ones(test_count)
    )
))

test_negatives = tf.data.Dataset.zip((
    test_anchor_ds,
    test_negative_ds,
    tf.data.Dataset.from_tensor_slices(
        tf.zeros(test_count)
    )
))


# Preprocess each pair

def preprocess_pair(anchor_path, comparison_path, label):
    return (
        preprocess(anchor_path),
        preprocess(comparison_path),
        label
    )

def augment_image(img):
    img = tf.image.random_brightness(img, max_delta=0.15)
    img = tf.image.random_contrast(img, lower=0.8, upper=1.2)
    img = tf.image.random_saturation(img, lower=0.7, upper=1.3)
    img = tf.image.random_hue(img, max_delta=0.08)
    img = tf.image.random_flip_left_right(img)

    return tf.clip_by_value(img, 0.0, 1.0)

def preprocess_train_pair(anchor_path, comparison_path, label):
    anchor_img = preprocess(anchor_path)
    comparison_img = preprocess(comparison_path)

    anchor_img = augment_image(anchor_img)
    comparison_img = augment_image(comparison_img)

    return (
        anchor_img,
        comparison_img,
        label
    )

train_data = train_positives.concatenate(train_negatives)

train_data = train_data.map(
    preprocess_train_pair,
    num_parallel_calls=tf.data.AUTOTUNE
)

train_data = train_data.shuffle(
    buffer_size=train_count * 2,
    seed=SEED
)

train_data = train_data.batch(16)

train_data = train_data.prefetch(
    tf.data.AUTOTUNE
)


test_data = test_positives.concatenate(test_negatives)

test_data = test_data.map(
    preprocess_pair,
    num_parallel_calls=tf.data.AUTOTUNE
)

test_data = test_data.batch(16)

test_data = test_data.prefetch(
    tf.data.AUTOTUNE
)


print("Train anchors:", len(train_anchor))
print("Test anchors:", len(test_anchor))

print("Train positives:", len(train_positive))
print("Test positives:", len(test_positive))

print("Training pairs:", train_count * 2)
print("Testing pairs:", test_count * 2)