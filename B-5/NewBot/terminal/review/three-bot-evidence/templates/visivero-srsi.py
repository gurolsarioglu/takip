# Generated from SRSI.txt
# Source template: Stochastic RSI

df = ohlc_df.copy()
if df.empty:
    raise ValueError("Chart OHLC data was not provided")

smooth_k = 3
smooth_d = 3
length_rsi = 14
length_stoch = 14
source_name = 'close'
k_color = '#2962FF'
d_color = '#FF6D00'
band_color = '#787B86'
fill_color = '#2196F3'
fill_opacity = 10
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

_stoch, k, d = ta_safe_stoch_rsi(source, length_rsi, length_stoch, smooth_k, smooth_d)

upper_id = plot(np.full(len(df), 80.0), title="Upper Band", color=band_color, pane="separate", pane_id="srsi", series_id="srsi_upper", linewidth=line_width)
plot(np.full(len(df), 50.0), title="Middle Band", color=tc_rgba(band_color, 50), pane="separate", pane_id="srsi", series_id="srsi_middle", linewidth=line_width)
lower_id = plot(np.full(len(df), 20.0), title="Lower Band", color=band_color, pane="separate", pane_id="srsi", series_id="srsi_lower", linewidth=line_width)
plot(k, title="K", color=k_color, pane="separate", pane_id="srsi", series_id="srsi_k", linewidth=line_width)
plot(d, title="D", color=d_color, pane="separate", pane_id="srsi", series_id="srsi_d", linewidth=line_width)
add_fill(upper_id, lower_id, tc_rgba(fill_color, fill_opacity), title="Background", fill_id="srsi_background")
print("Translated Pine: Stochastic RSI")