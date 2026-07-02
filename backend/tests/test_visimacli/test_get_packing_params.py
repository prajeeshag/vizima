import numpy as np
import xarray as xr

from vizima.cli.utils import get_packing_params


def _da(values):
    return xr.DataArray(np.array(values, dtype=float))


def test_basic_range():
    da = _da([0.0, 100.0])
    params = get_packing_params(da)
    n_levels = 2**16 - 1
    assert params["scale_factor"] == 100.0 / n_levels
    assert params["add_offset"] == 50.0


def test_symmetric_range():
    da = _da([-50.0, 50.0])
    params = get_packing_params(da)
    n_levels = 2**16 - 1
    assert np.isclose(params["scale_factor"], 100.0 / n_levels)
    assert np.isclose(params["add_offset"], 0.0)


def test_negative_range():
    da = _da([-100.0, -10.0])
    params = get_packing_params(da)
    n_levels = 2**16 - 1
    assert np.isclose(params["scale_factor"], 90.0 / n_levels)
    assert np.isclose(params["add_offset"], -55.0)


def test_custom_n_bits():
    da = _da([0.0, 255.0])
    params = get_packing_params(da, n_bits=8)
    n_levels = 2**8 - 1
    assert np.isclose(params["scale_factor"], 255.0 / n_levels)
    assert np.isclose(params["add_offset"], 127.5)


def test_scale_factor_decreases_with_more_bits():
    da = _da([0.0, 1.0])
    params_8 = get_packing_params(da, n_bits=8)
    params_16 = get_packing_params(da, n_bits=16)
    assert params_16["scale_factor"] < params_8["scale_factor"]


def test_add_offset_is_midpoint():
    da = _da([20.0, 80.0])
    params = get_packing_params(da)
    assert np.isclose(params["add_offset"], 50.0)


def test_uniform_data():
    """All values equal: scale_factor should be 0."""
    da = _da([5.0, 5.0, 5.0])
    params = get_packing_params(da)
    assert params["scale_factor"] == 0.0
    assert params["add_offset"] == 5.0


def test_2d_array():
    da = xr.DataArray(np.array([[0.0, 50.0], [25.0, 100.0]]))
    params = get_packing_params(da)
    n_levels = 2**16 - 1
    assert np.isclose(params["scale_factor"], 100.0 / n_levels)
    assert np.isclose(params["add_offset"], 50.0)
