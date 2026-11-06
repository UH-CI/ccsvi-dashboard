"""Naming helper for turning the notes spreadsheet's section names into dataset keys."""


def to_snake_case(name: str) -> str:
    name = name.replace(".", "_").replace("-", "_")
    name = "".join(c.lower() if c.isalnum() or c == "_" else "_" for c in name)
    while "__" in name:
        name = name.replace("__", "_")
    return name.strip("_")