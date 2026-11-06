"""Column names and missing-value markers shared by the census cleaning steps and the census loader."""

# Cell text the raw and cleaned census CSVs use for a missing value
MISSING_VALUES = ["", "-", "**", "null", "(X)"]

ESTIMATE_PREFIX = "Estimate!!"
MOE_PREFIX = "Margin of Error!!"

# Endings of the columns worked out from each estimate column, in the order they're written
PERCENT = " (%)"
MOE_PP = " (MOE pp)"
CV = " (CV)"
MOE_DERIVED = " (MOE derived)"
DERIVED_ENDINGS = (PERCENT, MOE_PP, CV, MOE_DERIVED)

# Ending of a column the pipeline adds up itself instead of reading from the Census file
CALC = " (calc.)"


# The margin-of-error column name for an estimate column name
def moe_column_name(col: str) -> str:
    if col.startswith(ESTIMATE_PREFIX):
        col = col[len(ESTIMATE_PREFIX):]
    return MOE_PREFIX + col
