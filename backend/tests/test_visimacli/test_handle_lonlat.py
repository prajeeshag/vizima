import numpy as np
import pytest
import xarray as xr

from vizima.cli.utils import handle_lats, handle_lons


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _1d_lon_ds(values, name="lon"):
    return xr.Dataset(
        {"temp": ((name,), np.zeros(len(values)))},
        coords={name: (name, values, {"units": "degrees_east"})},
    )


def _1d_lat_ds(values, name="lat"):
    return xr.Dataset(
        {"temp": ((name,), np.zeros(len(values)))},
        coords={name: (name, values, {"units": "degrees_north"})},
    )


def _2d_ds(lon_values, lat_values):
    """Dataset with 2-D lon/lat coordinate arrays (curvilinear grid)."""
    ny, nx = lon_values.shape
    return xr.Dataset(
        {"temp": (("y", "x"), np.zeros((ny, nx)))},
        coords={
            "lon": (("y", "x"), lon_values, {"units": "degrees_east"}),
            "lat": (("y", "x"), lat_values, {"units": "degrees_north"}),
        },
    )


# ---------------------------------------------------------------------------
# handle_lons – 1-D
# ---------------------------------------------------------------------------

def test_handle_lons_1d_corners():
    ds = _1d_lon_ds([0.0, 90.0, 180.0, 270.0])
    result = handle_lons(ds)
    assert "lon" in result
    corners = result["lon"].corners
    assert corners.lb == 0.0
    assert corners.rb == 270.0
    assert corners.rt == 270.0
    assert corners.lt == 0.0


def test_handle_lons_1d_count():
    ds = _1d_lon_ds(list(range(360)))
    result = handle_lons(ds)
    assert result["lon"].count == 360


def test_handle_lons_1d_negative_values():
    ds = _1d_lon_ds([-180.0, -90.0, 0.0, 90.0])
    result = handle_lons(ds)
    corners = result["lon"].corners
    assert corners.lb == -180.0
    assert corners.rb == 90.0


def test_handle_lons_no_longitude_coord():
    ds = xr.Dataset({"temp": (("x",), [1.0])}, coords={"x": [0]})
    assert handle_lons(ds) == {}


# ---------------------------------------------------------------------------
# handle_lons – 2-D
# ---------------------------------------------------------------------------

def test_handle_lons_2d_corners():
    lon = np.array([[10.0, 20.0, 30.0],
                    [11.0, 21.0, 31.0]])
    lat = np.array([[40.0, 40.0, 40.0],
                    [50.0, 50.0, 50.0]])
    ds = _2d_ds(lon, lat)
    result = handle_lons(ds)
    assert "lon" in result
    corners = result["lon"].corners
    assert corners.lb == 10.0   # [0, 0]
    assert corners.rb == 30.0   # [0, -1]
    assert corners.rt == 31.0   # [-1, -1]
    assert corners.lt == 11.0   # [-1, 0]


def test_handle_lons_2d_count():
    lon = np.array([[0.0, 10.0, 20.0],
                    [0.0, 10.0, 20.0]])
    lat = np.zeros_like(lon)
    ds = _2d_ds(lon, lat)
    result = handle_lons(ds)
    assert result["lon"].count == 3  # number of columns


# ---------------------------------------------------------------------------
# handle_lats – 1-D
# ---------------------------------------------------------------------------

def test_handle_lats_1d_corners():
    ds = _1d_lat_ds([-90.0, -45.0, 0.0, 45.0, 90.0])
    result = handle_lats(ds)
    assert "lat" in result
    corners = result["lat"].corners
    # For 1-D lat: lb == rb == values[0], lt == rt == values[-1]
    assert corners.lb == -90.0
    assert corners.rb == -90.0
    assert corners.rt == 90.0
    assert corners.lt == 90.0


def test_handle_lats_1d_count():
    ds = _1d_lat_ds(list(range(-90, 91)))
    result = handle_lats(ds)
    assert result["lat"].count == 181


def test_handle_lats_no_latitude_coord():
    ds = xr.Dataset({"temp": (("y",), [1.0])}, coords={"y": [0]})
    assert handle_lats(ds) == {}


# ---------------------------------------------------------------------------
# handle_lats – 2-D
# ---------------------------------------------------------------------------

def test_handle_lats_2d_corners():
    lon = np.array([[10.0, 20.0],
                    [10.0, 20.0]])
    lat = np.array([[40.0, 41.0],
                    [50.0, 51.0]])
    ds = _2d_ds(lon, lat)
    result = handle_lats(ds)
    assert "lat" in result
    corners = result["lat"].corners
    assert corners.lb == 40.0   # [0, 0]
    assert corners.rb == 41.0   # [0, -1]
    assert corners.rt == 51.0   # [-1, -1]
    assert corners.lt == 50.0   # [-1, 0]


def test_handle_lats_2d_count():
    lon = np.zeros((4, 3))
    lat = np.zeros((4, 3))
    ds = _2d_ds(lon, lat)
    result = handle_lats(ds)
    assert result["lat"].count == 4  # number of rows


# ---------------------------------------------------------------------------
# Invalid dimensionality
# ---------------------------------------------------------------------------

def test_handle_lons_3d_raises():
    ds = xr.Dataset(
        {"temp": (("a", "b", "c"), np.zeros((2, 2, 2)))},
        coords={
            "lon": (
                ("a", "b", "c"),
                np.zeros((2, 2, 2)),
                {"units": "degrees_east"},
            )
        },
    )
    with pytest.raises(ValueError, match="Dimension of longitude"):
        handle_lons(ds)


def test_handle_lats_3d_raises():
    ds = xr.Dataset(
        {"temp": (("a", "b", "c"), np.zeros((2, 2, 2)))},
        coords={
            "lat": (
                ("a", "b", "c"),
                np.zeros((2, 2, 2)),
                {"units": "degrees_north"},
            )
        },
    )
    with pytest.raises(ValueError, match="Dimension of latitude"):
        handle_lats(ds)
