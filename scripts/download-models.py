"""Fetch the original models unchanged from Dan Fleisch's companion website."""
from pathlib import Path
import subprocess
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor
models = {'Electric Fields': ['ElectricDipole', 'LinePositiveCharge', 'NegativePointCharge', 'PlaneNegativeCharge', 'PositivePointCharge', 'Sphere'], 'Magnetic Fields': ['BarMagnet', 'CurrentLoop', 'Horseshoe', 'Solenoid', 'StraightWire', 'Torus']}
def download(item):
    group, name = item
    url = 'https://www.danfleisch.com/maxwell/models/' + quote(group + '/' + name + '.wrl')
    data = subprocess.check_output(['curl', '-L', '--fail', '--retry', '2', '-sS', url])
    assert data.startswith(b'#VRML V1.0 ascii'), url
    Path('models', name + '.wrl').write_bytes(data)
    print(name, len(data))
with ThreadPoolExecutor(max_workers=6) as pool:
    list(pool.map(download, [(g, n) for g, names in models.items() for n in names]))
