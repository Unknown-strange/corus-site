"use client";

import Link from "next/link";
import { useState } from "react";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

import {
  RANGE_OPTIONS,
  getAnalyticsPoints,
  summarise,
  weekdayName,
  type AnalyticsOverview,
  type TrendSeries,
} from "@/lib/admin-dashboard";

import styles from "./AdminTrendChart.module.css";

type AdminTrendChartProps = {
  series: TrendSeries;

  analytics: {
    "7": AnalyticsOverview | null;
    "30": AnalyticsOverview | null;
    "90": AnalyticsOverview | null;
  };

  accentColor?: string;
};

type TooltipPayload = {
  payload: {
    date: string;
    value: number;
  };
};

function ChartTooltip({
  active,
  payload,
  metricLabel,
  accentColor,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  metricLabel: string;
  accentColor: string;
}) {
  if (
    !active ||
    !payload?.length
  ) {
    return null;
  }

  const point =
    payload[0].payload;

  return (
    <div
      className={
        styles.tooltip
      }
    >
      <p
        className={
          styles.tooltipDay
        }
      >
        {weekdayName(
          point.date
        )}
      </p>

      <p
        className={
          styles.tooltipValue
        }
        style={{
          color:
            accentColor,
        }}
      >
        {point.value}{" "}
        {metricLabel.toLowerCase()}
        {point.value !== 1
          ? "s"
          : ""}
      </p>
    </div>
  );
}

export default function AdminTrendChart({
  series,
  analytics,
  accentColor = "#ff5b00",
}: AdminTrendChartProps) {
  const [
    days,
    setDays,
  ] = useState(
    RANGE_OPTIONS[0].days
  );

  const response =
    days === 7
      ? analytics["7"]
      : days === 30
      ? analytics["30"]
      : analytics["90"];

  let points: {
    date: string;
    value: number;
  }[] = [];

  if (response) {
    const source =
      series.id ===
      "bookings"
        ? response.bookings
        : series.id ===
          "rentals"
        ? response.rentals
        : response.products;

    points =
      getAnalyticsPoints(
        source
      );
  }

  const {
    peakDay,
    average,
  } = summarise(points);

  const total =
    points.reduce(
      (sum, point) =>
        sum + point.value,
      0
    );

  const reportHref =
    `/admin/analytics/${series.id}`;

  return (
    <article
      className={
        styles.card
      }
    >
      {/* HEADER */}

      <div
        className={
          styles.head
        }
      >
        <div
          className={
            styles.titleArea
          }
        >
          <div
            className={
              styles.titleIcon
            }
            style={{
              backgroundColor:
                `${accentColor}15`,
              color:
                accentColor,
            }}
          >
            <series.icon
              size={19}
            />
          </div>

          <div>
            <h2
              className={
                styles.title
              }
            >
              {series.title}
            </h2>

            <p
              className={
                styles.subtitle
              }
            >
              Performance overview
            </p>
          </div>
        </div>

        <select
          className={
            styles.range
          }
          aria-label={`${series.title} date range`}
          value={days}
          onChange={(event) =>
            setDays(
              Number(
                event.target.value
              )
            )
          }
          style={{
            borderColor:
              `${accentColor}66`,
          }}
        >
          {RANGE_OPTIONS.map(
            (option) => (
              <option
                key={
                  option.days
                }
                value={
                  option.days
                }
              >
                {
                  option.label
                }
              </option>
            )
          )}
        </select>
      </div>

      {/* LEGEND */}

      <div
        className={
          styles.legend
        }
      >
        <span
          className={
            styles.legendDot
          }
          style={{
            background:
              accentColor,
          }}
        />

        {series.id ===
        "products"
          ? "Sales"
          : series.metricLabel}
      </div>

      {/* CHART */}

      <div
        className={
          styles.chartBox
        }
      >
        {response ===
        null ? (
          <div
            className={
              styles.chartLoading
            }
          >
            Loading analytics...
          </div>
        ) : points.length ===
          0 ? (
          <div
            className={
              styles.chartEmpty
            }
          >
            No data for this period.
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={points}
              margin={{
                top: 15,
                right: 4,
                left: 4,
                bottom: 10,
              }}
            >
              <XAxis
                dataKey="date"
                tickFormatter={
                  weekdayName
                }
                tick={{
                  fill:
                    "#98a2b3",
                  fontSize: 11,
                }}
                axisLine={false}
                tickLine={false}
                dy={8}
              />

              <YAxis
                hide
              />

              <Tooltip
                cursor={{
                  fill:
                    `${accentColor}0b`,
                }}
                content={
                  <ChartTooltip
                    metricLabel={
                      series.id ===
                      "products"
                        ? "Sale"
                        : series.metricLabel
                    }
                    accentColor={
                      accentColor
                    }
                  />
                }
              />

              <Bar
                dataKey="value"
                radius={[
                  8,
                  8,
                  0,
                  0,
                ]}
                barSize={
                  days === 7
                    ? 36
                    : undefined
                }
              >
                {points.map(
                  (_, index) => (
                    <Cell
                      key={
                        index
                      }
                      fill={
                        accentColor
                      }
                    />
                  )
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* FOOTER */}

      <div
        className={
          styles.footer
        }
      >
        <div
          className={
            styles.footerStat
          }
        >
          <span
            className={
              styles.statLabel
            }
          >
            Total
          </span>

          <span
            className={
              styles.statValue
            }
            style={{
              color:
                accentColor,
            }}
          >
            {total}
          </span>
        </div>

        <div
          className={
            styles.footerStat
          }
        >
          <span
            className={
              styles.statLabel
            }
          >
            Peak Day
          </span>

          <span
            className={
              styles.statValue
            }
          >
            {peakDay}
          </span>
        </div>

        <div
          className={
            styles.footerStat
          }
        >
          <span
            className={
              styles.statLabel
            }
          >
            Avg. Daily
          </span>

          <span
            className={
              styles.statValue
            }
          >
            {average}
          </span>
        </div>

        <Link
          href={reportHref}
          className={
            styles.report
          }
          style={{
            color:
              accentColor,
          }}
        >
          View Report →
        </Link>
      </div>
    </article>
  );
}