"use client";

import { theme } from "antd";
import { CategoryLabels, PlotSvg, ValueGrid } from "@/shared/charts/axes";
import { columnMarks, columnRect } from "@/shared/charts/bar-geometry";
import { ChartFrame } from "@/shared/charts/frame";
import { readSeries } from "@/shared/charts/fields";
import { linePath } from "@/shared/charts/path";
import { bandScale, formatMeasure, linearScale } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import { plotBox, type ChartChromeProps, type Datum } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

export type DualAxesChartProps = ChartChromeProps & {
  data?: readonly Datum[] | null;
  xField: string;
  columnField: string;
  lineField: string;
};

function align(
  categories: readonly string[],
  model: ReturnType<typeof readSeries>,
): (number | null)[] {
  const series = model.series[0];
  return categories.map((category) => {
    const index = model.categories.indexOf(category);
    if (!series || index < 0) {
      return null;
    }
    return series.values[index] ?? null;
  });
}

export function DualAxesChart({
  data,
  xField,
  columnField,
  lineField,
  title,
  height,
  loading = false,
  legend,
  tooltip = true,
  className,
  style,
}: DualAxesChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const columns = readSeries(data, xField, columnField);
  const lines = readSeries(data, xField, lineField);
  const categories = [...new Set([...columns.categories, ...lines.categories])];
  const columnValues = align(categories, columns);
  const lineValues = align(categories, lines);
  const columnScale = linearScale(columnValues.filter((value): value is number => value != null));
  const lineScale = linearScale(lineValues.filter((value): value is number => value != null));
  const marks = columnMarks({
    categories,
    series: [{ name: columnField, values: columnValues }],
    stacked: false,
  });
  const hiddenColumn = interaction.hidden.has(columnField);
  const hiddenLine = interaction.hidden.has(lineField);

  return (
    <ChartFrame
      className={className}
      empty={categories.length === 0}
      height={height}
      hidden={interaction.hidden}
      legend={legend ?? true}
      legendItems={[
        { id: columnField, label: columnField, color: token.colorPrimary },
        { id: lineField, label: lineField, color: token.cyan },
      ]}
      loading={loading}
      style={style}
      title={title}
      onToggleLegend={interaction.toggle}
    >
      {(plot) => {
        const box = plotBox(plot.width, plot.height, {
          top: 12,
          right: 52,
          bottom: 32,
          left: 48,
        });
        const bands = bandScale(categories);
        const points = lineValues.flatMap((value, index) => {
          const band = bands[index];
          if (value == null || !band) {
            return [];
          }
          return [
            {
              x: box.x + ((band.start + band.end) / 2) * box.width,
              y: box.y + (1 - lineScale.unit(value)) * box.height,
              value,
              label: categories[index] ?? "",
            },
          ];
        });
        return (
          <>
            <PlotSvg
              height={plot.height}
              label={title ?? "Dual axes chart"}
              width={plot.width}
              onLeave={interaction.hideTip}
            >
              <ValueGrid axis="y" box={box} scale={columnScale} token={token} />
              {lineScale.ticks.map((tick) => {
                const y = box.y + box.height * (1 - lineScale.unit(tick));
                return (
                  <text
                    key={`line-${tick}`}
                    fill={token.colorTextTertiary}
                    fontFamily={token.fontFamily}
                    fontSize={token.fontSizeSM}
                    x={box.x + box.width + 8}
                    y={y}
                  >
                    {formatMeasure(tick)}
                  </text>
                );
              })}
              {hiddenColumn
                ? null
                : marks.map((mark) => {
                    const rect = columnRect(mark, box, columnScale, false);
                    return (
                      <rect
                        key={mark.category}
                        fill={token.colorPrimary}
                        height={rect.height}
                        rx={2}
                        width={rect.width}
                        x={rect.x}
                        y={rect.y}
                        style={{ cursor: "pointer" }}
                        onMouseMove={(event) => {
                          if (!tooltip) {
                            return;
                          }
                          const at = pointerIn(event);
                          const line = lineValues[categories.indexOf(mark.category)];
                          interaction.showTip({
                            x: at.x,
                            y: at.y,
                            lines: [
                              mark.category,
                              `${columnField}: ${formatMeasure(mark.value)}`,
                              `${lineField}: ${line == null ? "" : formatMeasure(line)}`,
                            ],
                          });
                        }}
                      />
                    );
                  })}
              {hiddenLine ? null : (
                <path
                  d={linePath(points, false)}
                  fill="none"
                  stroke={token.cyan}
                  strokeWidth={2}
                />
              )}
              {hiddenLine
                ? null
                : points.map((point) => (
                    <circle
                      key={point.label}
                      cx={point.x}
                      cy={point.y}
                      fill={token.cyan}
                      r={3}
                      style={{ cursor: "pointer" }}
                      onMouseMove={(event) => {
                        if (!tooltip) {
                          return;
                        }
                        const at = pointerIn(event);
                        interaction.showTip({
                          x: at.x,
                          y: at.y,
                          lines: [point.label, `${lineField}: ${formatMeasure(point.value)}`],
                        });
                      }}
                    />
                  ))}
              <CategoryLabels axis="x" box={box} labels={categories} token={token} />
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
