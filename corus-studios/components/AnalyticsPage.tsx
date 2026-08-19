"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Package,
  TrendingUp,
} from "lucide-react";

import type { ReactNode } from "react";

import {
  getAnalyticsPoints,
  type AnalyticsResponse,
  type TrendSeriesId,
} from "@/lib/admin-dashboard";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import styles from "./AnalyticsPage.module.css";


const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";


type AnalyticsPageProps = {
  type: TrendSeriesId;
  title: string;
  eyebrow: string;
  description: string;
  accentColor: string;
};


type DateRange = {
  days: 7 | 30 | 90;
  label: string;
};


const RANGES: DateRange[] = [
  {
    days: 7,
    label: "7 Days",
  },
  {
    days: 30,
    label: "30 Days",
  },
  {
    days: 90,
    label: "90 Days",
  },
];


/* =========================================================
   FORMATTING
========================================================= */

const formatMoney = (
  value: string | number
) => {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return `GH₵${value}`;
  }

  return `GH₵${amount.toLocaleString(
    "en-GH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};


const formatDate = (
  value: string
) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-GH",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
};


/*
 * Recharts passes a ReactNode to labelFormatter,
 * not necessarily a string.
 *
 * This is why the previous:
 *
 * const formatBucket = (value: string) => ...
 *
 * caused the TypeScript error.
 */

const formatBucket = (
  value: ReactNode
) => {
  /*
   * ReactNode may be undefined, null,
   * numbers, strings, etc.
   */
  if (
    typeof value !== "string"
  ) {
    return String(
      value ?? ""
    );
  }

  const date = new Date(
    `${value}T12:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-GH",
    {
      day: "numeric",
      month: "short",
    }
  );
};


/* =========================================================
   ICON
========================================================= */

function getIcon(
  type: TrendSeriesId
) {
  if (
    type === "bookings"
  ) {
    return CalendarDays;
  }

  if (
    type === "rentals"
  ) {
    return Camera;
  }

  return Package;
}


/* =========================================================
   ENDPOINT
========================================================= */

function getEndpoint(
  type: TrendSeriesId
) {
  if (
    type === "bookings"
  ) {
    return "/admin/analytics/bookings";
  }

  if (
    type === "rentals"
  ) {
    return "/admin/analytics/rentals";
  }

  return "/admin/analytics/products";
}


/* =========================================================
   PAGE
========================================================= */

export default function AnalyticsPage({
  type,
  title,
  eyebrow,
  description,
  accentColor,
}: AnalyticsPageProps) {

  const [
    days,
    setDays,
  ] = useState<7 | 30 | 90>(30);


  const [
    data,
    setData,
  ] = useState<AnalyticsResponse | null>(
    null
  );


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );


  /* =======================================================
     FETCH ANALYTICS
  ======================================================= */

  useEffect(() => {

    const fetchAnalytics =
      async () => {

        try {

          setLoading(true);
          setError(null);

          const token =
            localStorage.getItem(
              "access_token"
            );


          if (!token) {

            window.location.href =
              "/login";

            return;
          }


          /*
           * Build date range.
           */

          const end =
            new Date();


          const start =
            new Date();


          start.setDate(
            end.getDate() -
              (days - 1)
          );


          const params =
            new URLSearchParams({
              start:
                start
                  .toISOString()
                  .split("T")[0],

              end:
                end
                  .toISOString()
                  .split("T")[0],

              interval:
                "day",

              top_limit:
                "10",
            });


          const response =
            await fetch(
              `${API_BASE}${getEndpoint(
                type
              )}?${params.toString()}`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,

                  Accept:
                    "application/json",
                },
              }
            );


          /*
           * Unauthorized.
           */

          if (
            response.status ===
            401
          ) {

            localStorage.removeItem(
              "access_token"
            );

            localStorage.removeItem(
              "user"
            );

            window.location.href =
              "/login";

            return;
          }


          if (!response.ok) {

            throw new Error(
              "Failed to load analytics."
            );
          }


          const result =
            (await response.json()) as AnalyticsResponse;


          setData(result);

        } catch (err) {

          console.error(err);

          setError(
            err instanceof Error
              ? err.message
              : "Failed to load analytics."
          );

        } finally {

          setLoading(false);

        }
      };


    fetchAnalytics();

  }, [
    type,
    days,
  ]);


  /* =======================================================
     CHART DATA
  ======================================================= */

  const points =
    useMemo(
      () =>
        data
          ? getAnalyticsPoints(
              data
            )
          : [],
      [data]
    );


  /* =======================================================
     SUMMARY VALUES
  ======================================================= */

  const totalCount =
    data?.total_count || 0;


  const totalRevenue =
    data?.total_revenue_ghs ||
    "0";


  const average =
    points.length > 0
      ? Math.round(
          totalCount /
            points.length
        )
      : 0;


  const Icon =
    getIcon(type);


  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <main
      className={
        styles.page
      }
    >

      <div
        className={
          styles.container
        }
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <section
          className={
            styles.hero
          }
        >

          <Link
            href="/admin"
            className={
              styles.backButton
            }
          >
            <ArrowLeft
              size={18}
            />
          </Link>


          <div
            className={
              styles.heroContent
            }
          >

            <span
              className={
                styles.eyebrow
              }

              style={{
                color:
                  accentColor,
              }}
            >
              {eyebrow}
            </span>


            <div
              className={
                styles.titleRow
              }
            >

              <div
                className={
                  styles.titleIcon
                }

                style={{
                  background:
                    `${accentColor}15`,

                  color:
                    accentColor,
                }}
              >
                <Icon
                  size={23}
                />
              </div>


              <div>

                <h1>
                  {title}
                </h1>


                <p>
                  {description}
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* =================================================
            DATE RANGE
        ================================================= */}

        <section
          className={
            styles.controls
          }
        >

          <div
            className={
              styles.rangeButtons
            }
          >

            {RANGES.map(
              (range) => (

                <button
                  key={
                    range.days
                  }

                  type="button"

                  className={
                    days ===
                    range.days
                      ? styles.rangeActive
                      : styles.rangeButton
                  }

                  onClick={() =>
                    setDays(
                      range.days
                    )
                  }

                  style={
                    days ===
                    range.days
                      ? {
                          background:
                            accentColor,

                          borderColor:
                            accentColor,
                        }
                      : undefined
                  }
                >
                  {
                    range.label
                  }
                </button>

              )
            )}

          </div>


          <span
            className={
              styles.period
            }
          >
            {data
              ? `${formatDate(
                  data.period_start
                )} — ${formatDate(
                  data.period_end
                )}`
              : "Loading period..."}
          </span>

        </section>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div
            className={
              styles.error
            }
          >
            {error}
          </div>

        )}


        {/* =================================================
            SUMMARY
        ================================================= */}

        <section
          className={
            styles.summaryGrid
          }
        >

          <article
            className={
              styles.summaryCard
            }
          >
            <span>
              Total Count
            </span>

            <strong
              style={{
                color:
                  accentColor,
              }}
            >
              {loading
                ? "—"
                : totalCount}
            </strong>
          </article>


          <article
            className={
              styles.summaryCard
            }
          >
            <span>
              Total Revenue
            </span>

            <strong>
              {loading
                ? "—"
                : formatMoney(
                    totalRevenue
                  )}
            </strong>
          </article>


          <article
            className={
              styles.summaryCard
            }
          >
            <span>
              Avg. Daily
            </span>

            <strong>
              {loading
                ? "—"
                : average}
            </strong>
          </article>


          <article
            className={
              styles.summaryCard
            }
          >
            <span>
              Top Items
            </span>

            <strong>
              {loading
                ? "—"
                : data?.top_items
                    .length || 0}
            </strong>
          </article>

        </section>


        {/* =================================================
            MAIN CHART
        ================================================= */}

        <section
          className={
            styles.chartCard
          }
        >

          <div
            className={
              styles.cardHeader
            }
          >

            <div>

              <h2>
                Performance
              </h2>

              <p>
                Daily activity across
                the selected period.
              </p>

            </div>


            <div
              className={
                styles.legend
              }
            >

              <span
                style={{
                  background:
                    accentColor,
                }}
              />


              {type ===
              "products"
                ? "Sales"
                : title}

            </div>

          </div>


          <div
            className={
              styles.chart
            }
          >

            {loading ? (

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
                  styles.chartLoading
                }
              >
                No data for this
                period.
              </div>

            ) : (

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={
                    points
                  }

                  margin={{
                    top: 15,
                    right: 10,
                    left: 0,
                    bottom: 8,
                  }}
                >

                  <CartesianGrid
                    vertical={
                      false
                    }

                    stroke="#f2f4f7"
                  />


                  <XAxis
                    dataKey="date"

                    tickFormatter={
                      formatBucket
                    }

                    axisLine={
                      false
                    }

                    tickLine={
                      false
                    }

                    tick={{
                      fill:
                        "#98a2b3",

                      fontSize:
                        11,
                    }}
                  />


                  <YAxis
                    hide
                  />


                  <Tooltip

                    contentStyle={{
                      borderRadius:
                        12,

                      border:
                        "1px solid #eaecf0",

                      boxShadow:
                        "0 10px 30px rgba(16,24,40,.10)",
                    }}

                    formatter={(
                      value
                    ) => [
                      value,
                      type ===
                      "products"
                        ? "Sales"
                        : title,
                    ]}

                    /*
                     * FIX:
                     * Recharts passes ReactNode here,
                     * not necessarily string.
                     */
                    labelFormatter={
                      formatBucket
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

        </section>


        {/* =================================================
            TOP ITEMS
        ================================================= */}

        <section
          className={
            styles.topItemsCard
          }
        >

          <div
            className={
              styles.cardHeader
            }
          >

            <div>

              <h2>
                Top Performers
              </h2>

              <p>
                Highest-performing
                items in this period.
              </p>

            </div>


            <TrendingUp
              size={20}

              style={{
                color:
                  accentColor,
              }}
            />

          </div>


          {loading ? (

            <div
              className={
                styles.topItemsLoading
              }
            >

              <div />
              <div />
              <div />

            </div>

          ) : data?.top_items
              .length ? (

            <div
              className={
                styles.topItemsList
              }
            >

              {data.top_items.map(
                (
                  item,
                  index
                ) => (

                  <article
                    key={
                      item.id
                    }

                    className={
                      styles.topItem
                    }
                  >

                    <div
                      className={
                        styles.rank
                      }

                      style={{
                        background:
                          `${accentColor}15`,

                        color:
                          accentColor,
                      }}
                    >
                      {index + 1}
                    </div>


                    <div
                      className={
                        styles.itemInfo
                      }
                    >

                      <strong>
                        {item.name}
                      </strong>


                      <span>
                        {item.count}{" "}
                        {
                          item.count ===
                          1
                            ? "activity"
                            : "activities"
                        }
                      </span>

                    </div>


                    <strong
                      className={
                        styles.itemRevenue
                      }
                    >
                      {formatMoney(
                        item.revenue_ghs
                      )}
                    </strong>

                  </article>

                )
              )}

            </div>

          ) : (

            <div
              className={
                styles.noTopItems
              }
            >
              No top items available.
            </div>

          )}

        </section>

      </div>

    </main>
  );
}