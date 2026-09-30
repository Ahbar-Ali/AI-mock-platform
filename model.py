import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import (
    Layer,
    Input,
    Conv2D,
    MaxPooling2D,
    Flatten,
    Dense
)

def make_embedding():
    inp = Input(shape=(100, 100, 3), name="input_image")

    x = Conv2D(64, (10, 10), activation="relu")(inp)
    x = MaxPooling2D(pool_size=(2, 2), padding="same")(x)

    x = Conv2D(128, (7, 7), activation="relu")(x)
    x = MaxPooling2D(pool_size=(2, 2), padding="same")(x)

    x = Conv2D(128, (4, 4), activation="relu")(x)
    x = MaxPooling2D(pool_size=(2, 2), padding="same")(x)

    x = Conv2D(256, (4, 4), activation="relu")(x)

    x = Flatten()(x)

    embedding = Dense(
        4096,
        activation="sigmoid"
    )(x)

    return Model(
        inputs=inp,
        outputs=embedding,
        name="embedding"
    )


class L1Dist(Layer):

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def call(self, input_embedding, validation_embedding):
        return tf.math.abs(
            input_embedding - validation_embedding
        )


def make_siamese_model():

    embedding = make_embedding()

    # First face
    input_image = Input(
        name="input_img",
        shape=(100, 100, 3)
    )

    # Second face
    validation_image = Input(
        name="validation_img",
        shape=(100, 100, 3)
    )

    # Convert BOTH faces to embeddings using the SAME network
    input_embedding = embedding(input_image)
    validation_embedding = embedding(validation_image)

    # Compare the embeddings
    distances = L1Dist(name="distance")(
        input_embedding,
        validation_embedding
    )

    # Produce one probability
    classifier = Dense(
        1,
        activation="sigmoid"
    )(distances)

    return Model(
        inputs=[input_image, validation_image],
        outputs=classifier,
        name="SiameseNetwork"
    )


if __name__ == "__main__":
    siamese_model = make_siamese_model()
    siamese_model.summary()