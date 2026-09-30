import os
import shutil

NEG_PATH = os.path.join("data", "negative")
LFW_PATH = "lfw"

os.makedirs(NEG_PATH, exist_ok=True)

count = 0

for person_folder in os.listdir(LFW_PATH):
    person_path = os.path.join(LFW_PATH, person_folder)

    if not os.path.isdir(person_path):
        continue

    for filename in os.listdir(person_path):
        source = os.path.join(person_path, filename)

        # Make filename unique using folder/person name
        new_filename = f"{person_folder}_{filename}"
        destination = os.path.join(NEG_PATH, new_filename)

        shutil.copy2(source, destination)
        count += 1

print(f"Copied {count} negative images.")