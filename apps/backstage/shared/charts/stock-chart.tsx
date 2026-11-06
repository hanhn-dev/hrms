"use client";

import { theme } from "antd";
import { CategoryLabels, PlotSvg, ValueGrid } from "@/shared/charts/axes";
import { ChartFrame } from "@/shared/charts/frame";
import { labelField, numberField } from "@/shared/charts/fields";
import { bandScale, formatMeasure, linearScale } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import { plotBox, type ChartChromeProps, type Datum } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

type Candle = {
  label: string;
  open: number;
  close: number;
  high: number;
  low: number;
};

function readCandles(
  rows: readonly Datum[] | null | undefined,
  xField: string,
  openField: string,
  closeField: string,
  highField: string,
  lowField: string,
): Candle[] {
  const candles: Candle[] = [];
  for (const row of rows ?? []) {
    const label = labelField(row, xField);
    const open = numberField(row, openField);
    const close = numberField(row, closeField);
    const high = numberField(row, highField);
    const low = numberField(row, lowField);
    if (label == null || open == null || close == null || high == null || low == null) {
      continue;
    }
    candles.push({ label, open, close, high, low });
  }
  return candles;
}

export type StockChartProps = ChartChromeProps & {
  data?: readonly Datum[] | null;
  xField: string;
  openField: string;
  closeField: string;
  highField: string;
  lowField: string;
};

export function StockChart({
  data,
  xField,
  openField,
  closeField,
  highField,
  lowField,
  title,
  height,
  loading = false,
  legend = false,
  tooltip = true,
  className,
  style,
}: StockChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const candles = readCandles(data, xField, openField, closeField, highField, lowField);
  const scale = linearScale(candles.flatMap((candle) => [candle.high, candle.low]));
  const bands = bandScale(candles.map((candle) => candle.label));

  return (
    <ChartFrame
      className={className}
      empty={candles.length === 0}
      height={height}
      legend={legend}
      loading={loading}
      style={style}
      title={title}
    >
      {(plot) => {
        const box = plotBox(plot.width, plot.height);
        const yOf = (value: number): number => box.y + (1 - scale.unit(value)) * box.height;
        return (
          <>
            <PlotSvg
              height={plot.height}
              label={title ?? "Stock chart"}
              width={plot.width}
              onLeave={interaction.hideTip}
            >
              <ValueGrid axis="y" box={box} scale={scale} token={token} />
              {candles.map((candle, index) => {
                const band = bands[index];
                if (!band) {
                  return null;
                }
                const center = box.x + ((band.start + band.end) / 2) * box.width;
                const bodyWidth = Math.max(4, band.size * box.width * 0.6);
                const up = candle.close >= candle.open;
                const color = up ? token.colorSuccess : token.colorError;
                const bodyTop = yOf(Math.max(candle.open, candle.close));
                const bodyHeight = Math.max(1, Math.abs(yOf(candle.open) - yOf(candle.close)));
                return (
                  <g
                    key={candle.label}
                    style={{ cursor: "pointer" }}
                    onMouseMove={(event) => {
                      if (!tooltip) {
                        return;
                      }
                      const at = pointerIn(event);
                      interaction.showTip({
                        x: at.x,
                        y: at.y,
                        lines: [
                          candle.label,
                          `open ${formatMeasure(candle.open)}`,
                          `close ${formatMeasure(candle.close)}`,
                          `high ${formatMeasure(candle.high)}`,
                          `low ${formatMeasure(candle.low)}`,
                        ],
                      });
                    }}
                  >
                    <line
                      stroke={color}
                      x1={center}
                      x2={center}
                      y1={yOf(candle.high)}
                      y2={yOf(candle.low)}
                    />
                    <rect
                      fill={color}
                      height={bodyHeight}
                      width={bodyWidth}
                      x={center - bodyWidth / 2}
                      y={bodyTop}
                    />
                  </g>
                );
              })}
              <CategoryLabels
                axis="x"
                box={box}
                labels={candles.map((candle) => candle.label)}
                token={token}
              />
            </PlotSvg>
            {tooltip && interaction.tip ? (
              <ChartTooltip
                bounds={plot}
                lines={interaction.tip.lines}
                x={interaction.tip.x}
                y={interaction.tip.y}
              />
            ) : null}
          </>
        );
      }}
    </ChartFrame>
  );
}
