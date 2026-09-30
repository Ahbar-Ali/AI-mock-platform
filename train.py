import os
import tensorflow as tf
from tensorflow.keras.metrics import Precision, Recall

from model import make_siamese_model
from dataset import train_data, test_data


# Build model
siamese_model = make_siamese_model()

# Loss function
loss_fn = tf.keras.losses.BinaryCrossentropy()

# Optimizer
optimizer = tf.keras.optimizers.Adam(
    learning_rate=0.0001
)

checkpoint_dir = "training_checkpoints"
os.makedirs(checkpoint_dir, exist_ok=True)

checkpoint = tf.train.Checkpoint(
    optimizer=optimizer,
    siamese_model=siamese_model
)


@tf.function
def train_step(batch):

    # batch contains:
    # anchor images, comparison images, labels
    anchor_images = batch[0]
    comparison_images = batch[1]
    labels = batch[2]

    # TensorFlow records what happens here
    with tf.GradientTape() as tape:

        predictions = siamese_model(
            [anchor_images, comparison_images],
            training=True
        )

        loss = loss_fn(labels, predictions)

    # Figure out how each model weight contributed to the error
    gradients = tape.gradient(
        loss,
        siamese_model.trainable_variables
    )

    # Update the weights
    optimizer.apply_gradients(
        zip(gradients,siamese_model.trainable_variables)
    )
    return loss


def train(data, epochs):

    for epoch in range(1, epochs + 1):
        print(f"\nEpoch {epoch}/{epochs}")
        precision = Precision()
        recall = Recall()

        total_loss = 0
        batches = 0

        for batch in data:
            loss = train_step(batch)
            anchor_images = batch[0]
            comparison_images = batch[1]
            labels = batch[2]
            predictions = siamese_model(
                [anchor_images, comparison_images],
                training=False
            )
            precision.update_state(labels, predictions)
            recall.update_state(labels, predictions)
            total_loss += float(loss)
            batches += 1

        average_loss = total_loss / batches

        print(f"Loss: {average_loss:.4f}")
        print(f"Precision: {precision.result().numpy():.4f}")
        print(f"Recall: {recall.result().numpy():.4f}")

        # Save every 5 epochs
        if epoch % 5 == 0:
            checkpoint.save(
                file_prefix=os.path.join(
                    checkpoint_dir,
                    "ckpt"
                )
            )


EPOCHS = 20

train(train_data, EPOCHS)

print("\nEvaluating on test data...")

test_precision = Precision()
test_recall = Recall()

test_loss_total = 0
test_batches = 0

for batch in test_data:
    anchor_images = batch[0]
    comparison_images = batch[1]
    labels = batch[2]

    predictions = siamese_model(
        [anchor_images, comparison_images],
        training=False
    )

    loss = loss_fn(labels, predictions)

    test_precision.update_state(labels, predictions)
    test_recall.update_state(labels, predictions)

    test_loss_total += float(loss)
    test_batches += 1

average_test_loss = test_loss_total / test_batches

print(f"Test Loss: {average_test_loss:.4f}")
print(f"Test Precision: {test_precision.result().numpy():.4f}")
print(f"Test Recall: {test_recall.result().numpy():.4f}")


siamese_model.save_weights("siamese.weights.h5")

print("Model weights saved.")