from app.ml.engine import physiological_step


def test_physiological_bounds():
    g, i, c = physiological_step(140, 1.0, 40, 0.2)
    assert 40 <= g <= 400
    assert i >= 0
    assert c >= 0
