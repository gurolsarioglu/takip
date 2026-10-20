# Generated from BB.txt
# Source template: Bollinger Bands

df = ohlc_df.copy()
if df.empty:
    raise ValueError("Chart OHLC data was not provided")

length = 20
ma_type = 'SMA'
source_name = 'close'
mult = 2.0
offset = 0
basis_color = '#2962FF'
upper_color = '#F23645'
lower_color = '#089981'
fill_color = '#2962FF'
fill_opacity = 8
line_width = 1

def tc_rgba(hex_color, opacity_pct):
    raw = str(hex_color or '').strip().lstrip('#')
    if len(raw) == 3:
        raw = raw[0] * 2 + raw[1] * 2 + raw[2] * 2
    if len(raw) != 6:
        raw = '000000'
    alpha = max(0.0, min(100.0, float(opacity_pct))) / 100.0
    return 'rgba(%d, %d, %d, %.3f)' % (int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16), alpha)

if source_name == "hl2":
    source = (df["high"] + df["low"]) / 2.0
elif source_name == "hlc3":
    source = (df["high"] + df["low"] + df["close"]) / 3.0
elif source_name == "ohlc4":
    source = (df["open"] + df["high"] + df["low"] + df["close"]) / 4.0
else:
    source = df[source_name if source_name in df.columns else "close"]

source_values = source.to_numpy(dtype="float64")
volume_values = df["volume"].to_numpy(dtype="float64")

basis = ta_safe_ma(source_values, length, ma_type, volume_values)
dev = ta_safe_std(source_values, length, mult)
upper = basis + dev
lower = basis - dev

plot(basis, title="Basis", color=basis_color, pane="overlay", pane_id="bb", series_id="bb_basis", linewidth=line_width)
upper_id = plot(upper, title="Upper", color=upper_color, pane="overlay", pane_id="bb", series_id="bb_upper", linewidth=line_width)
lower_id = plot(lower, title="Lower", color=lower_color, pane="overlay", pane_id="bb", series_id="bb_lower", linewidth=line_width)
add_fill(upper_id, lower_id, tc_rgba(fill_color, fill_opacity), title="Background", fill_id="bb_background")
print("Translated Pine: Bollinger Bands")
if offset != 0:
    print("Offset parsed but not rendered yet.")