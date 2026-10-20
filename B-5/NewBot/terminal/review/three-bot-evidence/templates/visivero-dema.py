# Generated from Dema.txt
# Source template: Double EMA

df = ohlc_df.copy()
if df.empty:
    raise ValueError("Chart OHLC data was not provided")

length = 9
length_2 = 12
source_name = 'close'
dema_color = '#43A047'
dema_2_color = '#E91E63'
line_width = 1

if source_name == "hl2":
    source = (df["high"] + df["low"]) / 2.0
elif source_name == "hlc3":
    source = (df["high"] + df["low"] + df["close"]) / 3.0
elif source_name == "ohlc4":
    source = (df["open"] + df["high"] + df["low"] + df["close"]) / 4.0
else:
    source = df[source_name if source_name in df.columns else "close"]

source_values = source.to_numpy(dtype="float64")
e1 = talib.EMA(source_values, timeperiod=length)
e2 = talib.EMA(e1, timeperiod=length)
dema = 2.0 * e1 - e2

f1 = talib.EMA(source_values, timeperiod=length_2)
f2 = talib.EMA(f1, timeperiod=length_2)
dema_2 = 2.0 * f1 - f2

plot(dema, title="DEMA", color=dema_color, pane="overlay", pane_id="dema", series_id="dema", linewidth=line_width)
plot(dema_2, title="DEMA 2", color=dema_2_color, pane="overlay", pane_id="dema", series_id="dema_2", linewidth=line_width)
print("Translated Pine: Double EMA")