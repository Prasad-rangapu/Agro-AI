"""
SoilGrids Data Fetch Module
Optimized fetch of soil properties for ML features with proxies.
"""

import requests
import time
from typing import Dict


def get_soil_point(
    lat: float,
    lon: float,
    depth_range: str = "0-30cm",
    properties: list = ["nitrogen","phh2o","soc","sand","silt","clay"]
) -> Dict:
    """
    Fetch soil properties from SoilGrids API using provided filters.

    Returns all requested properties plus calculated P and K proxies.
    """
    prop_params = "&".join(f"property={p}" for p in properties)
    url = (
        f"https://rest.isric.org/soilgrids/v2.0/properties/query?"
        f"lat={lat}&lon={lon}&{prop_params}"
    )

    try:
        r = requests.get(url, headers={"Accept":"application/json"}, timeout=100)
        r.raise_for_status()
        data = r.json().get("properties", {})
    except Exception as e:
        print(f"Error fetching SoilGrids data: {e} Using default values.")
        data = {}

    def mean_val(prop):
        for layer in data.get(prop, {}).get("depths", []):
            if depth_range in layer.get("label", ""):
                return layer["values"].get("mean")
        return None

    N = mean_val("nitrogen")
    pH = mean_val("phh2o")
    OC = mean_val("soc")
    sand = mean_val("sand")
    silt = mean_val("silt")
    clay = mean_val("clay")

    pH_val = (pH or 65) / 10
    OC_percent = (OC or 12) / 10
    N_val = N or 15
    sand_pct = sand or 450
    silt_pct = silt or 300
    clay_pct = clay or 250

    # Proxies for P and K (approximate)
    P_proxy = OC_percent * 2.0
    K_proxy = 50.0 if clay_pct > 300 else 25.0

    if clay_pct >= 400:
        texture = "clay"
    elif sand_pct >= 700:
        texture = "sandy"
    elif clay_pct >= 200:
        texture = "loamy"
    else:
        texture = "sandy_loam"

    return {
        "nitrogen": N_val,
        "ph": pH_val,
        "organic_carbon": OC_percent,
        "sand": sand_pct / 10,
        "silt": silt_pct / 10,
        "clay": clay_pct / 10,
        "P_proxy": P_proxy,
        "K_proxy": K_proxy,
        "texture_class": texture,
        "fetch_timestamp": time.time(),
        "data_source": url
    }


if __name__ == "__main__":
    import json
    sample = get_soil_point(17.686815, 83.218483)
    print(json.dumps(sample, indent=2))
