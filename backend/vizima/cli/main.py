import json
import logging
import typing as t
from pathlib import Path

import cf_xarray as cf  # noqa: F401
import numpy as np
import pandas as pd
import questionary
import typer
import xarray as xr
from .utils import (
    handle_datavars,
    handle_times,
    handle_levels,
    handle_lons,
    handle_lats,
    handle_projection,
    skip_variables,
    handle_vectors,
    ask_text,
    get_packing_params,
)

from ..dataset_model import (
    DataProjection,
    Dataset,
    DataVar,
    Lambert,
    LatAxis,
    LatCorners,
    LonAxis,
    LonCorners,
    LonLat,
    Mercator,
    Polar,
    TimeAxis,
    VectorVar,
    VertAxis,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s : %(name)s | %(message)s",
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

app = typer.Typer(add_completion=False)


@app.command()
def prepare_metadata(
    dataset_file: t.Annotated[
        Path, typer.Argument(help="Path to the dataset file", exists=True)
    ],
    metadata_file: t.Annotated[
        Path, typer.Option(help="Path to save the metadata json file")
    ] = Path("dataset_meta.json"),
):
    ds = xr.open_dataset(dataset_file)

    times = handle_times(ds)
    levels = handle_levels(ds)
    lons = handle_lons(ds)
    lats = handle_lats(ds)
    projection = handle_projection(ds)

    try:
        skipped_vars = skip_variables(ds)
        data_vars = [str(v) for v in ds.data_vars if str(v) not in skipped_vars]
        datavars = handle_datavars(ds, data_vars, levels)
        vectors = handle_vectors(ds, data_vars, levels)
        title = ask_text("", "Title for this dataset: ")
        subtitle = ask_text("", "Subtitle for this dataset: ")
        description = ask_text("", "Description for this dataset: ")
    except KeyboardInterrupt:
        logger.info("Conversation interrupted by user")
        exit(1)

    # This is just for validation
    dataset = Dataset(
        lons=lons,
        lats=lats,
        times=times,
        verticals=levels,
        datavars=datavars,
        vectors=vectors,
        projection=projection,
        title=title,
        subtitle=subtitle,
        description=description,
    )

    metadata = dataset.model_dump()

    del metadata["times"]
    del metadata["lons"]
    del metadata["lats"]
    del metadata["verticals"]

    metadata_file.parent.mkdir(parents=True, exist_ok=True)
    with open(metadata_file, "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Metadata saved to {metadata_file}")


@app.command()
def process_dataset(
    dataset_file: t.Annotated[
        Path,
        typer.Argument(
            help="Path to the dataset file", exists=True, file_okay=True, dir_okay=False
        ),
    ],
    metadata_file: t.Annotated[
        Path,
        typer.Option(
            help="Path to the metadata json file",
            exists=True,
            file_okay=True,
            dir_okay=False,
        ),
    ],
    out: t.Annotated[
        Path,
        typer.Option(help="Path to save the processed dataset"),
    ] = Path("dataset.zarr"),
):
    ds = xr.open_dataset(dataset_file)
    metadata = json.load(open(metadata_file))

    lons = handle_lons(ds)
    lats = handle_lats(ds)
    levels = handle_levels(ds)
    times = handle_times(ds)

    dataset = Dataset(
        lons=lons,
        lats=lats,
        verticals=levels,
        times=times,
        datavars=metadata["datavars"],
        vectors=metadata["vectors"],
        projection=metadata["projection"],
        title=metadata["title"],
        subtitle=metadata["subtitle"],
        description=metadata["description"],
    )

    out_ds = xr.Dataset()
    encoding: dict[str, dict] = {}

    for _, dataarray in metadata["datavars"].items():
        arr_name = dataarray["arrName"]
        var = ds[arr_name]
        out_ds[arr_name] = var

        last_two = var.dims[-2:]
        maybe_time = var.dims[0]
        var_stack = var.stack(_tmp=last_two)
        min_var = var_stack.min("_tmp")
        max_var = var_stack.max("_tmp")
        range_var = xr.concat([min_var, max_var], dim="range")
        out_ds[f"{arr_name}_range"] = range_var

        if dataarray["time"]:
            var_stack = var.stack(_tmp=[*last_two, maybe_time])
            min_time = var_stack.min("_tmp")
            max_time = var_stack.max("_tmp")
            range_time = xr.concat([min_time, max_time], dim="range")
            out_ds[f"{arr_name}_rangeTime"] = range_time

        # TODO: need to implement intelligent chunking strategy
        chunks = []
        chunk_minmax = []
        if dataarray["time"]:
            chunks.append(1)
            chunk_minmax.append(1)
        if dataarray["vertical"]:
            chunks.append(1)
            chunk_minmax.append(1)
        chunks.append(var.shape[-2])
        chunks.append(var.shape[-1])

        encoding[arr_name] = {
            "dtype": "int16",
            "_FillValue": -32767,
            "chunks": tuple(chunks),
            **get_packing_params(var),
        }
        encoding[f"{arr_name}_range"] = {
            "chunks": tuple(chunk_minmax),
        }

    attrs = dataset.model_dump()
    with open(f"{out}.json", "w") as f:
        json.dump(attrs, f)

    out_ds.to_zarr(out, mode="w", encoding=encoding)

    logger.info(f"Dataset saved to {out}")


if __name__ == "__main__":
    app()
