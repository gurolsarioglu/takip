# Generated from WTCross.txt
# Source template: WaveTrend with Crosses [LazyBear]

df = ohlc_df.copy()
if df.empty:
    raise ValueError("Chart OHLC data was not provided")

n1 = 10
n2 = 21
ob_level1 = 60
ob_level2 = 53
os_level1 = -60
os_level2 = -53
wt1_color = '#22C55E'
wt2_color = '#EF4444'
spread_color = '#3B82F6'
zero_color = '#9CA3AF'
ob_color = '#EF4444'
os_color = '#22C55E'
cross_up_color = '#84CC16'
cross_down_color = '#EF4444'
line_width = 1

def tc_rgba(hex_color, opacity_pct):
    raw = str(hex_color or '').strip().lstrip('#')
    if len(raw) == 3:
        raw = raw[0] * 2 + raw[1] * 2 + raw[2] * 2
    if len(raw) != 6:
        raw = '000000'
    alpha = max(0.0, min(100.0, float(opacity_pct))) / 100.0
    return 'rgba(%d, %d, %d, %.3f)' % (int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16), alpha)

ap = (df["high"] + df["low"] + df["close"]) / 3.0
ap_values = ap.to_numpy(dtype="float64")
esa = talib.EMA(ap_values, timeperiod=n1)
d = talib.EMA(np.abs(ap_values - esa), timeperiod=n1)
ci = np.where(d == 0, np.nan, (ap_values - esa) / (0.015 * d))
tci = talib.EMA(ci, timeperiod=n2)
wt1 = pd.Series(tci, index=df.index, dtype="float64")
wt2 = wt1.rolling(window=4, min_periods=4).mean()
spread = wt1 - wt2

plot(np.zeros(len(df)), title="Zero", color=zero_color, pane="separate", pane_id="wt", series_id="wt_zero", linewidth=line_width)
plot(np.full(len(df), ob_level1), title="OB1", color=tc_rgba(ob_color, 50), pane="separate", pane_id="wt", series_id="wt_ob1", linewidth=line_width)
plot(np.full(len(df), os_level1), title="OS1", color=tc_rgba(os_color, 50), pane="separate", pane_id="wt", series_id="wt_os1", linewidth=line_width)
plot(np.full(len(df), ob_level2), title="OB2", color=tc_rgba(ob_color, 50), pane="separate", pane_id="wt", series_id="wt_ob2", linewidth=line_width)
plot(np.full(len(df), os_level2), title="OS2", color=tc_rgba(os_color, 50), pane="separate", pane_id="wt", series_id="wt_os2", linewidth=line_width)
plot(wt1, title="WT1", color=wt1_color, pane="separate", pane_id="wt", series_id="wt1", linewidth=line_width)
plot(wt2, title="WT2", color=wt2_color, pane="separate", pane_id="wt", series_id="wt2", linewidth=line_width)
plot(spread, title="WT Spread", color=spread_color, pane="separate", pane_id="wt", render_type="baseline", base_value=0.0, linewidth=line_width, series_id="wt_spread")

bullish_cross = (wt1 > wt2) & (wt1.shift(1) <= wt2.shift(1))
bearish_cross = (wt1 < wt2) & (wt1.shift(1) >= wt2.shift(1))
plotshape(wt2.where(bullish_cross), title="", color=cross_up_color, shape="circle", position="absolute", text="", series_id="wt2")
plotshape(wt2.where(bearish_cross), title="", color=cross_down_color, shape="circle", position="absolute", text="", series_id="wt2")
print("Translated Pine: WaveTrend with Crosses [LazyBear]")