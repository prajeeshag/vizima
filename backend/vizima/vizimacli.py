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

from .dataset_model import (
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

WRF_PROJ_ID_MAPPING = {
    1: "Lambert",
    2: "Polar",
    3: "Mercator",
    6: "RotLonLat",
}


def get_packing_params(da, n_bits=16):
    """Calculates optimal scale_factor and add_offset for signed packing."""
    data_min = float(da.min().values)
    data_max = float(da.max().values)

    # Range of a signed n-bit integer
    n_levels = 2**n_bits - 1

    scale_factor = (data_max - data_min) / n_levels
    # Offset is the midpoint to utilize the full signed range (-32768 to 32767)
    add_offset = (data_max + data_min) / 2

    return {"scale_factor": scale_factor, "add_offset": add_offset}


def format_to_iso(val):
    if isinstance(val, np.datetime64):
        return f"{pd.Timestamp(val).isoformat()}Z"
    if hasattr(val, "isoformat"):
        return val.isoformat()
    if isinstance(val, str):
        # check if it is in isoformat
        try:
            return pd.Timestamp(val).isoformat()
        except ValueError:
            raise ValueError("Unsupported time type")
    raise ValueError("Unsupported time type")


def ask_text(default: any, message: str) -> str:  # type: ignore
    return questionary.text(message, default=default).unsafe_ask()


def handle_lons(ds: xr.Dataset) -> dict[str, LonAxis]:
    names = ds.cf.coordinates.get("longitude", [])
    axis: dict[str, LonAxis] = {}
    for name in names:
        coord = ds[name]
        match coord.values.ndim:
            case 1:
                axis[str(coord.name)] = LonAxis(
                    corners=LonCorners(
                        lb=coord.values[0],
                        rb=coord.values[-1],
                        rt=coord.values[-1],
                        lt=coord.values[0],
                    ),
                    count=len(coord.values),
                )
            case 2:
                axis[str(coord.name)] = LonAxis(
                    corners=LonCorners(
                        lb=coord.values[0, 0],
                        rb=coord.values[0, -1],
                        rt=coord.values[-1, -1],
                        lt=coord.values[-1, 0],
                    ),
                    count=len(coord.values[0, :]),
                )
            case _:
                raise ValueError(
                    f"Dimension of longitude coordinate should be 1 or 2. Got {coord.values.ndim} for {coord.name}"
                )
    return axis


def handle_lats(ds: xr.Dataset) -> dict[str, LatAxis]:
    names = ds.cf.coordinates.get("latitude", [])
    axis: dict[str, LatAxis] = {}
    for name in names:
        coord = ds[name]
        match coord.values.ndim:
            case 1:
                axis[str(coord.name)] = LatAxis(
                    corners=LatCorners(
                        lb=coord.values[0],
                        rb=coord.values[0],
                        rt=coord.values[-1],
                        lt=coord.values[-1],
                    ),
                    count=len(coord.values),
                )
            case 2:
                axis[str(coord.name)] = LatAxis(
                    corners=LatCorners(
                        lb=coord.values[0, 0],
                        rb=coord.values[0, -1],
                        rt=coord.values[-1, -1],
                        lt=coord.values[-1, 0],
                    ),
                    count=len(coord.values[:, 0]),
                )
            case _:
                raise ValueError(
                    f"Dimension of latitude coordinate should be 1 or 2. Got {coord.values.ndim} for {coord.name}"
                )
    return axis


def check_periodic_lon(lon0, dlon, nlon):
    lon_wrap = lon0 + dlon * nlon
    return True if np.isclose(lon_wrap - lon0, 360) else False


def handle_times(ds) -> dict[str, TimeAxis]:
    names = ds.cf.coordinates.get("time", [])
    if not names:
        return {}
    times: dict[str, TimeAxis] = {}
    for name in names:
        time = ds[name]
        if time.values.ndim == 0:
            continue
        times[time.name] = TimeAxis.model_validate(
            [format_to_iso(t) for t in time.values]
        )
    return times


def skip_variables(ds):
    return questionary.checkbox(
        "Select variables which you want to skip:", choices=list(ds.data_vars)
    ).unsafe_ask()


def get_lon_name_for_var(var: xr.DataArray) -> str:
    try:
        return var.cf["longitude"].name
    except (KeyError, AttributeError):
        return ""


def get_lat_name_for_var(var: xr.DataArray) -> str:
    try:
        return var.cf["latitude"].name
    except (KeyError, AttributeError):
        return ""


def get_vertical_name_for_var(
    var: xr.DataArray,
    ds_verticals: dict[str, VertAxis],
) -> str:
    try:
        vname = var.cf["vertical"].name
    except (KeyError, AttributeError):
        return ""

    if vname in ds_verticals:
        return vname
    else:
        logger.warning(
            f"Vertical coordinate `{vname}` for variable `{var.name}` not found in dataset!"
        )
        return ""


def get_time_name_for_var(var: xr.DataArray) -> str:
    try:
        return var.cf["time"].name
    except (KeyError, AttributeError):
        return ""


def handle_vectors(
    ds: xr.Dataset,
    data_vars: list[str],
    ds_verticals: dict[str, VertAxis],
) -> dict[str, VectorVar]:
    vectors: dict[str, VectorVar] = {}
    vec_choices = questionary.checkbox(
        "Select variables to group as Vectors (pairs):", choices=data_vars
    ).unsafe_ask()

    if not vec_choices:
        return vectors

    for i in range(0, len(vec_choices), 2):
        if i + 1 < len(vec_choices):
            v1: str = vec_choices[i]
            v2: str = vec_choices[i + 1]

            var1: xr.DataArray = ds[v1]
            var2: xr.DataArray = ds[v2]

            levelv1: str = get_vertical_name_for_var(var1, ds_verticals)
            levelv2: str = get_vertical_name_for_var(var2, ds_verticals)
            if levelv1 != levelv2:
                raise ValueError(f"Levels don't match for ({v1}, {v2})")

            timev1: str = get_time_name_for_var(var1)
            timev2: str = get_time_name_for_var(var2)
            if timev1 != timev2:
                raise ValueError(f"Time don't match for ({v1}, {v2})")

            name: str = ask_text(f"{v1}_{v2}", f"Vector name for ({v1}, {v2}):")
            units: str = ask_text(
                ds[v1].attrs.get("units", ""),
                f"Units for ({v1}, {v2}):",
            )

            standard_name: str = ask_text(
                ds[v1].attrs.get("standard_name", ""),
                f"Standard name for ({v1}, {v2}):",
            )

            long_name: str = ask_text(
                ds[v1].attrs.get("long_name", ""),
                f"Long name for ({v1}, {v2}):",
            )

            vectors[name] = VectorVar(
                uArrName=v1,
                vArrName=v2,
                units=units,
                long_name=long_name,
                standard_name=standard_name,
                vertical=levelv1,
                time=timev1,
            )
    return vectors


def handle_datavars(
    ds: xr.Dataset,
    data_vars: list[str],
    ds_verticals: dict[str, VertAxis],
) -> dict[str, DataVar]:
    datavars: dict[str, DataVar] = {}
    for v in data_vars:
        name: str = ask_text(
            v,
            f"Want to rename {v}? (leave as is to keep original): ",
        )

        units: str = ask_text(ds[v].attrs.get("units"), f"Units for {v}:")

        long_name: str = ask_text(ds[v].attrs.get("long_name"), f"Long Name for {v}:")

        standard_name: str = ask_text(
            ds[v].attrs.get("standard_name"),
            f"Standard Name for {v}:",
        )

        level = get_vertical_name_for_var(ds[v], ds_verticals)
        lon = get_lon_name_for_var(ds[v])
        lat = get_lat_name_for_var(ds[v])
        time = get_time_name_for_var(ds[v])

        datavars[name] = DataVar(
            units=units,
            long_name=long_name,
            standard_name=standard_name,
            vertical=level,
            arrName=v,
            lon=lon,
            lat=lat,
            time=time,
        )

    return datavars


def handle_levels(ds: xr.Dataset) -> dict[str, VertAxis]:
    names = ds.cf.coordinates.get("vertical", [])
    levels: dict[str, VertAxis] = {}

    for name in names:
        units = ds[name].attrs.get("units", "")
        if ds[name].values.ndim == 0:
            continue
        levels[name] = VertAxis([f"{val} {units}".strip() for val in ds[name].values])

    return levels


def get_proj_name_from_ds(ds: xr.Dataset) -> str:
    proj_name = ds.attrs.get("projection", "")
    if proj_name not in PROJECTION_MAPPING:
        # WRF PROJ
        proj_id = ds.attrs.get("MAP_PROJ", -1)
        proj_name = WRF_PROJ_ID_MAPPING.get(proj_id, "")
    return proj_name


def process_lambert(ds: xr.Dataset) -> Lambert:
    """
    Process conic conformal projection.
    """
    truelat1 = ds.attrs.get("TRUELAT1", None)
    if truelat1 is None:
        raise ValueError("TRUELAT1 not found in dataset attributes")

    truelat2 = ds.attrs.get("TRUELAT2", None)
    if truelat2 is None:
        raise ValueError("TRUELAT2 not found in dataset attributes")

    stand_lon = ds.attrs.get("STAND_LON", None)
    if stand_lon is None:
        raise ValueError("STAND_LON not found in dataset attributes")

    return Lambert(
        name="Lambert",
        standLon=stand_lon,
        trueLat1=truelat1,
        trueLat2=truelat2,
    )


def process_rotatedpole(ds: xr.Dataset) -> LonLat:
    """
    Process rotated pole projection.
    """
    pole_lon = ds.attrs.get("POLE_LON", None)
    if pole_lon is None:
        raise ValueError("POLE_LON not found in dataset attributes")

    pole_lat = ds.attrs.get("POLE_LAT", None)
    if pole_lat is None:
        raise ValueError("POLE_LAT not found in dataset attributes")

    return LonLat(
        name="LonLat",
        poleLon=pole_lon,
        poleLat=pole_lat,
    )


def process_mercator(ds: xr.Dataset) -> Mercator:
    return Mercator(name="Mercator")


def process_lonlat(ds: xr.Dataset) -> LonLat:
    return LonLat(name="LonLat", poleLat=90, poleLon=0)


def process_polar(ds: xr.Dataset) -> Polar:
    truelat = ds.attrs.get("TRUELAT1", None)
    if truelat is None:
        raise ValueError("TRUELAT1 not found in dataset attributes")

    stand_lon = ds.attrs.get("STAND_LON", None)
    if stand_lon is None:
        raise ValueError("stand_lon not found in dataset attributes")
    return Polar(
        name="Polar",
        standLon=stand_lon,
        trueLat=truelat,
    )


PROJECTION_MAPPING: dict[
    str, t.Callable[[xr.Dataset], LonLat | Mercator | Polar | Lambert]
] = {
    "LonLat": process_lonlat,
    "Mercator": process_mercator,
    "Stereographic": process_polar,
    "RotLonLat": process_rotatedpole,
    "Lambert": process_lambert,
}


def handle_projection(
    ds: xr.Dataset,
) -> DataProjection:
    """
    Handle projection detection and return appropriate projection object.
    """
    proj_name = get_proj_name_from_ds(ds)

    if not proj_name:
        if questionary.confirm("Is this data in regular lat-lon projection?").ask():
            proj_name = "LonLat"
    try:
        proj = PROJECTION_MAPPING[proj_name](ds)
        return DataProjection(proj)
    except KeyError:
        raise ValueError(f"Unsupported projection or no projection found: {proj_name}")


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
    out_ds.attrs = dataset.model_dump()

    encoding: dict[str, dict] = {}

    for _, dataarray in metadata["datavars"].items():
        var = ds[dataarray["arrName"]]
        out_ds[dataarray["arrName"]] = var

        # TODO: need to implement intelligent chunking strategy
        chunks = []
        if dataarray["time"]:
            chunks.append(1)
        if dataarray["vertical"]:
            chunks.append(1)
        chunks.append(var.shape[-2])
        chunks.append(var.shape[-1])

        encoding[dataarray["arrName"]] = {
            "dtype": "int16",
            "_FillValue": -32767,
            "chunks": tuple(chunks),
            **get_packing_params(var),
        }

    out_ds.to_zarr(out, mode="w", encoding=encoding)

    logger.info(f"Dataset saved to {out}")


if __name__ == "__main__":
    app()
