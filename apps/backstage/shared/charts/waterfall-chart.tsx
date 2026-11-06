"use client";

import { theme } from "antd";
import { CategoryLabels, PlotSvg, ValueGrid } from "@/shared/charts/axes";
import { ChartFrame } from "@/shared/charts/frame";
import { readLabeledValues } from "@/shared/charts/fields";
import { waterfallSteps } from "@/shared/charts/layout";
import { bandScale, formatMeasure, linearScale } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import { plotBox, type ChartChromeProps, type Datum } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

export type WaterfallChartProps = ChartChromeProps & {
  data?: readonly Datum[] | null;
  xField: string;
  yField: string;
};

export function WaterfallChart({
  data,
  xField,
  yField,
  title,
  height,
  loading = false,
  legend = false,
  tooltip = true,
  className,
  style,
}: WaterfallChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const items = readLabeledValues(data, xField, yField);
  const steps = waterfallSteps(
    items.map((item) => item.label),
    items.map((item) => item.value),
  );
  const scale = linearScale(steps.flatMap((step) => [step.start, step.end]));
  const bands = bandScale(steps.map((step) => step.label));

  return (
    <ChartFrame
      className={className}
      empty={items.length === 0}
      height={height}
      legend={legend}
      loading={loading}
      style={style}
      title={title}
    >
      {(plot) => {
        const box = plotBox(plot.width, plot.height);
        return (
          <>
            <PlotSvg
              height={plot.height}
              label={title ?? "Waterfall chart"}
              width={plot.width}
              onLeave={interaction.hideTip}
            >
              <ValueGrid axis="y" box={box} scale={scale} token={token} />
              {steps.map((step, index) => {
                const band = bands[index];
                if (!band) {
                  return null;
                }
                const top = Math.max(step.start, step.end);
                const bottom = Math.min(step.start, step.end);
                const y = box.y + (1 - scale.unit(top)) * box.height;
                const heightPx = Math.abs(scale.unit(top) - scale.unit(bottom)) * box.height;
                const x = box.x + band.start * box.width;
                const color = step.total
                  ? token.colorPrimary
                  : step.value >= 0
                    ? token.colorSuccess
                    : token.colorError;
                const next = steps[index + 1];
                const connectorY = box.y + (1 - scale.unit(step.end)) * box.height;
                return (
                  <g key={`${step.label}-${index}`}>
                    <rect
                      fill={color}
                      height={Math.max(heightPx, 1)}
                      rx={2}
                      width={band.size * box.width}
                      x={x}
                      y={y}
                      style={{ cursor: "pointer" }}
                      onMouseMove={(event) => {
                        if (!tooltip) {
                          return;
                        }
                        const at = pointerIn(event);
                        interaction.showTip({
                          x: at.x,
                          y: at.y,
                          lines: [step.label, formatMeasure(step.value)],
                        });
                      }}
                    />
                    {next && !step.total ? (
                      <line
                        stroke={token.colorTextQuaternary}
                        strokeDasharray="3 3"
                        x1={x + band.size * box.width}
                        x2={box.x + (bands[index + 1]?.start ?? band.end) * box.width}
                        y1={connectorY}
                        y2={connectorY}
                      />
                    ) : null}
                  </g>
                );
              })}
              <CategoryLabels
                axis="x"
                box={box}
                labels={steps.map((step) => step.label)}
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
