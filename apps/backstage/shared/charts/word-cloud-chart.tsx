"use client";

import { theme } from "antd";
import { ChartFrame } from "@/shared/charts/frame";
import { placeWords } from "@/shared/charts/layout";
import { seriesColor } from "@/shared/charts/palette";
import { formatMeasure } from "@/shared/charts/scale";
import { ChartTooltip, pointerIn } from "@/shared/charts/tooltip";
import type { ChartChromeProps, WordDatum } from "@/shared/charts/types";
import { useChartInteraction } from "@/shared/charts/use-chart";

export type WordCloudChartProps = ChartChromeProps & {
  data?: readonly WordDatum[] | null;
};

export function WordCloudChart({
  data,
  title,
  height,
  loading = false,
  legend = false,
  tooltip = true,
  className,
  style,
}: WordCloudChartProps): React.JSX.Element {
  const { token } = theme.useToken();
  const interaction = useChartInteraction();
  const words = (data ?? [])
    .filter((word) => word.text.length > 0 && Number.isFinite(word.value) && word.value > 0)
    .sort((left, right) => right.value - left.value);

  return (
    <ChartFrame
      className={className}
      empty={words.length === 0}
      height={height}
      legend={legend}
      loading={loading}
      style={style}
      title={title}
    >
      {(plot) => {
        const max = Math.max(...words.map((word) => word.value), 1);
        const boxes = words.map((word) => {
          const fontSize = 12 + (word.value / max) * 28;
          return {
            text: word.text,
            value: word.value,
            width: fontSize * word.text.length * 0.62,
            height: fontSize * 1.2,
            fontSize,
          };
        });
        const placed = placeWords(boxes, { width: plot.width, height: plot.height });
        return (
          <>
            <svg
              aria-label={title ?? "Word cloud"}
              height={plot.height}
              role="img"
              width={plot.width}
              onMouseLeave={interaction.hideTip}
            >
              {placed.map((word, index) => {
                if (!word.placed) {
                  return null;
                }
                const source = boxes[index];
                return (
                  <text
                    key={`${word.text}-${index}`}
                    fill={seriesColor(token, index, words.length)}
                    fontFamily={token.fontFamily}
                    fontSize={source?.fontSize ?? token.fontSize}
                    fontWeight={index === 0 ? token.fontWeightStrong : 400}
                    style={{ cursor: "pointer" }}
                    x={word.x}
                    y={word.y + (source?.fontSize ?? 12)}
                    onMouseMove={(event) => {
                      if (!tooltip) {
                        return;
                      }
                      const at = pointerIn(event);
                      interaction.showTip({
                        x: at.x,
                        y: at.y,
                        lines: [word.text, formatMeasure(source?.value ?? 0)],
                      });
                    }}
                  >
                    {word.text}
                  </text>
                );
              })}
            </svg>
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
