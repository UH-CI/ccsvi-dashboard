"""File and naming helpers used when centralizing raw datasets for cleaning."""

import os
import shutil

# Copy disparate datasets to centralized directory.
def copy_file(source_path: str, destination_dir: str) -> bool:
    destination_dir = os.path.expanduser(destination_dir)
    os.makedirs(destination_dir, exist_ok=True)
    filename = os.path.basename(source_path)
    destination_path = os.path.join(destination_dir, filename)

    if os.path.exists(destination_path):
        print(f"{filename} already exists in {destination_dir}")
        return False
    try:
        shutil.copy2(source_path, destination_dir)
        return True
    except Exception:
        print(f"Error copying {filename}")
        return False

# Move disparate datasets to centralized directory.
def move_file(source_path: str, destination_dir: str) -> bool:
    destination_dir = os.path.expanduser(destination_dir)
    os.makedirs(destination_dir, exist_ok=True)
    filename = os.path.basename(source_path)
    destination_path = os.path.join(destination_dir, filename)

    if os.path.exists(destination_path):
        print(f"{filename} already exists in {destination_dir}")
        return False
    try:
        shutil.move(source_path, destination_dir)
        return True
    except Exception:
        print(f"Error moving {filename}")
        return False


def to_snake_case(name: str) -> str:
    name = name.replace(".", "_").replace("-", "_")
    name = "".join(c.lower() if c.isalnum() or c == "_" else "_" for c in name)
    while "__" in name:
        name = name.replace("__", "_")
    return name.strip("_")