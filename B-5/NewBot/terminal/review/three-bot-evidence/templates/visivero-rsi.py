# Generated from Rsi.txt
# Source template: Relative Strength Index

df = ohlc_df.copy()
if df.empty:
    raise ValueError("Chart OHLC data was not provided")

rsi_length = 14
source_name = 'close'
ma_type = 'SMA'
ma_length = 14
bb_mult = 2.0
rsi_color = '#7E57C2'
band_color = '#787B86'
ma_color = '#FACC15'
bb_color = '#22C55E'
fill_color = '#7E57C2'
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

rsi = ta_safe_rsi(source, rsi_length)

upper_id = plot(np.full(len(df), 70.0), title="RSI Upper Band", color=band_color, pane="separate", pane_id="rsi", series_id="rsi_upper", linewidth=line_width)
plot(np.full(len(df), 50.0), title="RSI Middle Band", color=tc_rgba(band_color, 50), pane="separate", pane_id="rsi", series_id="rsi_middle", linewidth=line_width)
lower_id = plot(np.full(len(df), 30.0), title="RSI Lower Band", color=band_color, pane="separate", pane_id="rsi", series_id="rsi_lower", linewidth=line_width)
plot(rsi, title="RSI", color=rsi_color, pane="separate", pane_id="rsi", series_id="rsi", linewidth=line_width)
add_fill(upper_id, lower_id, tc_rgba(fill_color, fill_opacity), title="RSI Background Fill", fill_id="rsi_background")

enable_ma = ma_type != "None"
is_bb = ma_type == "SMA + Bollinger Bands"
if enable_ma:
    if ma_type in ("SMA", "SMA + Bollinger Bands"):
        smoothing_ma = ta_safe_ma(rsi, ma_length, "SMA")
    elif ma_type == "EMA":
        smoothing_ma = ta_safe_ma(rsi, ma_length, "EMA")
    elif ma_type == "SMMA (RMA)":
        smoothing_ma = ta_safe_ma(rsi, ma_length, "SMMA (RMA)")
    elif ma_type == "WMA":
        smoothing_ma = ta_safe_ma(rsi, ma_length, "WMA")
    elif ma_type == "VWMA":
        smoothing_ma = ta_safe_ma(rsi, ma_length, "VWMA", df["volume"])
    else:
        smoothing_ma = ta_safe_ma(rsi, ma_length, "SMA")

    plot(smoothing_ma, title="RSI-based MA", color=ma_color, pane="separate", pane_id="rsi", series_id="rsi_ma", linewidth=line_width)
    if is_bb:
        smoothing_std = ta_safe_std(rsi, ma_length, bb_mult)
        bb_upper = smoothing_ma + smoothing_std
        bb_lower = smoothing_ma - smoothing_std
        bb_upper_id = plot(bb_upper, title="Upper Bollinger Band", color=bb_color, pane="separate", pane_id="rsi", series_id="rsi_bb_upper", linewidth=line_width)
        bb_lower_id = plot(bb_lower, title="Lower Bollinger Band", color=bb_color, pane="separate", pane_id="rsi", series_id="rsi_bb_lower", linewidth=line_width)
        add_fill(bb_upper_id, bb_lower_id, tc_rgba(bb_color, 10), title="Bollinger Bands Background Fill", fill_id="rsi_bb_fill")

print("Translated Pine: Relative Strength Index")
if "calculateDivergence = input.bool(true" in '\ufeff//@version=6\nindicator(title="Relative Strength Index", shorttitle="RSI", format=format.price, precision=2, timeframe="", timeframe_gaps=true)\n\nrsiLengthInput = input.int(14, minval=1, title="RSI Length", group="RSI Settings")\nrsiSourceInput = input.source(close, "Source", group="RSI Settings")\ncalculateDivergence = input.bool(false, title="Calculate Divergence", group="RSI Settings", display = display.data_window, tooltip = "Calculating divergences is needed in order for divergence alerts to fire.")\n\nchange = ta.change(rsiSourceInput)\nup = ta.rma(math.max(change, 0), rsiLengthInput)\ndown = ta.rma(-math.min(change, 0), rsiLengthInput)\nrsi = down == 0 ? 100 : up == 0 ? 0 : 100 - (100 / (1 + up / down))\n\nrsiPlot = plot(rsi, "RSI", color=#7E57C2)\nrsiUpperBand = hline(70, "RSI Upper Band", color=#787B86)\nmidline = hline(50, "RSI Middle Band", color=color.new(#787B86, 50))\nrsiLowerBand = hline(30, "RSI Lower Band", color=#787B86)\nfill(rsiUpperBand, rsiLowerBand, color=color.rgb(126, 87, 194, 90), title="RSI Background Fill")\nmidLinePlot = plot(50, color = na, editable = false, display = display.none)\nfill(rsiPlot, midLinePlot, 100, 70, top_color = color.new(color.green, 0), bottom_color = color.new(color.green, 100),    title = "Overbought Gradient Fill")\nfill(rsiPlot, midLinePlot, 30,    0,    top_color = color.new(color.red, 100), bottom_color = color.new(color.red, 0),            title = "Oversold Gradient Fill")\n\n// Smoothing MA inputs\nGRP = "Smoothing"\nTT_BB = "Only applies when \'SMA + Bollinger Bands\' is selected. Determines the distance between the SMA and the bands."\nmaTypeInput = input.string("SMA", "Type", options = ["None", "SMA", "SMA + Bollinger Bands", "EMA", "SMMA (RMA)", "WMA", "VWMA"], group = GRP, display = display.data_window)\nvar isBB = maTypeInput == "SMA + Bollinger Bands"\nmaLengthInput = input.int(14, "Length", group = GRP, display = display.data_window, active = maTypeInput != "None")\nbbMultInput = input.float(2.0, "BB StdDev", minval = 0.001, maxval = 50, step = 0.5, tooltip = TT_BB, group = GRP, display = display.data_window, active = isBB)\nvar enableMA = maTypeInput != "None"\n\n// Smoothing MA Calculation\nma(source, length, MAtype) =>\n          switch MAtype\n                    "SMA"                                      => ta.sma(source, length)\n                    "SMA + Bollinger Bands" => ta.sma(source, length)\n                    "EMA"                                      => ta.ema(source, length)\n                    "SMMA (RMA)"                        => ta.rma(source, length)\n                    "WMA"                                      => ta.wma(source, length)\n                    "VWMA"                                    => ta.vwma(source, length)\n\n// Smoothing MA plots\nsmoothingMA = enableMA ? ma(rsi, maLengthInput, maTypeInput) : na\nsmoothingStDev = isBB ? ta.stdev(rsi, maLengthInput) * bbMultInput : na\nplot(smoothingMA, "RSI-based MA", color=color.yellow, display = enableMA ? display.all : display.none, editable = enableMA)\nbbUpperBand = plot(smoothingMA + smoothingStDev, title = "Upper Bollinger Band", color=color.green, display = isBB ? display.all : display.none, editable = isBB)\nbbLowerBand = plot(smoothingMA - smoothingStDev, title = "Lower Bollinger Band", color=color.green, display = isBB ? display.all : display.none, editable = isBB)\nfill(bbUpperBand, bbLowerBand, color= isBB ? color.new(color.green, 90) : na, title="Bollinger Bands Background Fill", display = isBB ? display.all : display.none, editable = isBB)\n\n// Divergence\nlookbackRight = 5\nlookbackLeft = 5\nrangeUpper = 60\nrangeLower = 5\nbearColor = color.red\nbullColor = color.green\ntextColor = color.white\nnoneColor = color.new(color.white, 100)\n\n_inRange(bool cond) =>\n        bars = ta.barssince(cond)\n        rangeLower <= bars and bars <= rangeUpper\n\nplFound = false\nphFound = false\n\nbullCond = false\nbearCond = false\n\nrsiLBR = rsi[lookbackRight]\n\nif calculateDivergence\n        //------------------------------------------------------------------------------\n        // Regular Bullish\n        // rsi: Higher Low\n        plFound := not na(ta.pivotlow(rsi, lookbackLeft, lookbackRight))        \n        rsiHL = rsiLBR > ta.valuewhen(plFound, rsiLBR, 1) and _inRange(plFound[1])\n        // Price: Lower Low\n        lowLBR = low[lookbackRight]\n        priceLL = lowLBR < ta.valuewhen(plFound, lowLBR, 1)\n        bullCond := priceLL and rsiHL and plFound\n\n        //------------------------------------------------------------------------------\n        // Regular Bearish\n        // rsi: Lower High\n        phFound := not na(ta.pivothigh(rsi, lookbackLeft, lookbackRight))\n        rsiLH = rsiLBR < ta.valuewhen(phFound, rsiLBR, 1) and _inRange(phFound[1])\n        // Price: Higher High\n        highLBR = high[lookbackRight]\n        priceHH = highLBR > ta.valuewhen(phFound, highLBR, 1)\n        bearCond := priceHH and rsiLH and phFound\n\n\nplot(\n          plFound      ? rsiLBR : na,\n          offset        = -lookbackRight,\n          title          = "Regular Bullish",\n          linewidth = 2,\n          color          = (bullCond ? bullColor : noneColor),\n          display      = display.pane,\n          editable    = calculateDivergence)\n\nplotshape(\n          bullCond    ? rsiLBR : na,\n          offset        = -lookbackRight,\n          title          = "Regular Bullish Label",\n          text            = " Bull ",\n          style          = shape.labelup,\n          location    = location.absolute,\n          color          = bullColor,\n          textcolor = textColor,\n          display      = display.pane,\n          editable    = calculateDivergence)\n\nplot(\n          phFound      ? rsiLBR : na,\n          offset        = -lookbackRight,\n          title          = "Regular Bearish",\n          linewidth = 2,\n          color          = (bearCond ? bearColor : noneColor),\n          display      = display.pane,\n          editable    = calculateDivergence)\n\nplotshape(\n          bearCond    ? rsiLBR : na,\n          offset        = -lookbackRight,\n          title          = "Regular Bearish Label",\n          text            = " Bear ",\n          style          = shape.labeldown,\n          location    = location.absolute,\n          color          = bearColor,\n          textcolor = textColor,\n          display      = display.pane,\n          editable    = calculateDivergence)\n\nalertcondition(bullCond, title=\'Regular Bullish Divergence\', message="Found a new Regular Bullish Divergence, `Pivot Lookback Right` number of bars to the left of the current bar.")\nalertcondition(bearCond, title=\'Regular Bearish Divergence\', message=\'Found a new Regular Bearish Divergence, `Pivot Lookback Right` number of bars to the left of the current bar.\')\n\n':
    print("Divergence calculation is not translated yet.")