"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingCart,
  CreditCard,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import api from "@/lib/api";
import type { CatalogProduct } from "@/lib/types";

import styles from "./page.module.css";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type CartItemResponse = {
  product_id: string;
  quantity: number;
};

type CartResponseShape = {
  items?: CartItemResponse[];
};

function getErrorMessage(
  data: unknown,
  fallback: string
): string {
  if (
    typeof data === "string" &&
    data.trim()
  ) {
    return data;
  }

  if (
    data &&
    typeof data === "object"
  ) {
    if (
      "detail" in data
    ) {
      const detail = (
        data as {
          detail?: unknown;
        }
      ).detail;

      if (
        typeof detail ===
        "string"
      ) {
        return detail;
      }

      if (
        Array.isArray(detail)
      ) {
        const messages =
          detail
            .map((item) => {
              if (
                item &&
                typeof item ===
                  "object" &&
                "msg" in item &&
                typeof (
                  item as {
                    msg?: unknown;
                  }
                ).msg ===
                  "string"
              ) {
                return (
                  item as {
                    msg: string;
                  }
                ).msg;
              }

              return null;
            })
            .filter(
              (
                message
              ): message is string =>
                Boolean(message)
            );

        if (
          messages.length > 0
        ) {
          return messages.join(
            ", "
          );
        }
      }
    }

    if (
      "message" in data &&
      typeof (
        data as {
          message?: unknown;
        }
      ).message ===
        "string"
    ) {
      return (
        data as {
          message: string;
        }
      ).message;
    }
  }

  return fallback;
}

export default function StoreProductPage({
  params,
}: PageProps) {
  const [product, setProduct] =
    useState<CatalogProduct | null>(
      null
    );

  const [quantity, setQuantity] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [notice, setNotice] =
    useState("");

  /* =========================================================
     LOAD PRODUCT
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const loadProduct =
      async () => {
        try {
          const { id } =
            await params;

          const response =
            await api.catalog.productBySlug(
              id
            );

          if (
            !response.ok
          ) {
            throw new Error(
              "Product not found."
            );
          }

          const data: CatalogProduct =
            await response.json();

          if (!mounted) {
            return;
          }

          setProduct(data);

          if (
            data.stock > 0
          ) {
            setQuantity(1);
          }
        } catch (err) {
          if (mounted) {
            setError(
              err instanceof Error
                ? err.message
                : "Failed to load product."
            );
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    loadProduct();

    return () => {
      mounted = false;
    };
  }, [params]);

  /* =========================================================
     ADD TO CART
  ========================================================= */

  const addToCart =
    async () => {
      if (!product) {
        return;
      }

      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        setNotice(
          "Please log in to add products to your cart."
        );

        return;
      }

      try {
        setActionLoading(true);
        setNotice("");
        setError(null);

        const response =
          await api.cart.addItem(
            {
              product_id:
                product.id,
              quantity,
            },
            token
          );

        const rawBody =
          await response
            .text()
            .catch(() => "");

        let data: unknown =
          null;

        if (rawBody) {
          try {
            data =
              JSON.parse(
                rawBody
              );
          } catch {
            data =
              rawBody;
          }
        }

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
          console.error(
            "ADD TO CART FAILED",
            {
              status:
                response.status,
              body: data,
            }
          );

          throw new Error(
            getErrorMessage(
              data,
              "Unable to add item to cart."
            )
          );
        }

        setNotice(
          `${product.name} was added to your cart.`
        );
      } catch (err) {
        setNotice(
          err instanceof Error
            ? err.message
            : "Unable to add item to cart."
        );
      } finally {
        setActionLoading(false);
      }
    };

  /* =========================================================
     BUY NOW

     1. Read current cart
     2. If product exists -> PATCH quantity
     3. If product does not exist -> POST item
     4. Redirect to /checkout

     /checkout is responsible for POST /orders/checkout
     and redirecting to Paystack.
  ========================================================= */

  const buyNow =
    async () => {
      if (!product) {
        return;
      }

      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        setNotice(
          "Please log in before checking out."
        );

        return;
      }

      try {
        setActionLoading(true);
        setNotice("");
        setError(null);

        /* -----------------------------------------
           GET CURRENT CART
        ----------------------------------------- */

        const cartResponse =
          await api.cart.get(
            token
          );

        if (
          cartResponse.status ===
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

        if (
          !cartResponse.ok
        ) {
          const rawBody =
            await cartResponse
              .text()
              .catch(() => "");

          let cartError:
            unknown = rawBody;

          if (rawBody) {
            try {
              cartError =
                JSON.parse(
                  rawBody
                );
            } catch {
              // Keep raw text.
            }
          }

          console.error(
            "LOAD CART FOR BUY NOW FAILED",
            {
              status:
                cartResponse.status,
              body: cartError,
            }
          );

          throw new Error(
            getErrorMessage(
              cartError,
              "Unable to load your cart."
            )
          );
        }

        const cart =
          (await cartResponse.json()) as CartResponseShape;

        const existingItem =
          Array.isArray(
            cart.items
          )
            ? cart.items.find(
                (
                  item
                ) =>
                  item.product_id ===
                  product.id
              )
            : undefined;

        /* -----------------------------------------
           PRODUCT ALREADY EXISTS
        ----------------------------------------- */

        if (existingItem) {
          const updateResponse =
            await api.cart.updateItem(
              product.id,
              quantity,
              token
            );

          const rawBody =
            await updateResponse
              .text()
              .catch(() => "");

          let updateData:
            unknown = rawBody;

          if (rawBody) {
            try {
              updateData =
                JSON.parse(
                  rawBody
                );
            } catch {
              // Keep raw string.
            }
          }

          if (
            updateResponse.status ===
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

          if (
            !updateResponse.ok
          ) {
            console.error(
              "UPDATE CART FOR BUY NOW FAILED",
              {
                status:
                  updateResponse.status,
                body:
                  updateData,
              }
            );

            throw new Error(
              getErrorMessage(
                updateData,
                "Unable to prepare checkout."
              )
            );
          }
        }

        /* -----------------------------------------
           PRODUCT NOT IN CART
        ----------------------------------------- */

        else {
          const addResponse =
            await api.cart.addItem(
              {
                product_id:
                  product.id,
                quantity,
              },
              token
            );

          const rawBody =
            await addResponse
              .text()
              .catch(() => "");

          let addData:
            unknown = rawBody;

          if (rawBody) {
            try {
              addData =
                JSON.parse(
                  rawBody
                );
            } catch {
              // Keep raw string.
            }
          }

          if (
            addResponse.status ===
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

          if (
            !addResponse.ok
          ) {
            console.error(
              "ADD ITEM FOR BUY NOW FAILED",
              {
                status:
                  addResponse.status,
                body:
                  addData,
              }
            );

            throw new Error(
              getErrorMessage(
                addData,
                "Unable to prepare checkout."
              )
            );
          }
        }

        /* -----------------------------------------
           NOW GO TO CHECKOUT
        ----------------------------------------- */

        window.location.href =
          "/checkout";
      } catch (err) {
        console.error(
          "BUY NOW FAILED",
          err
        );

        setNotice(
          err instanceof Error
            ? err.message
            : "Unable to prepare checkout."
        );

        setActionLoading(false);
      }
    };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <>
        <Navbar />

        <main
          className={
            styles.page
          }
        >
          <div
            className={
              styles.loading
            }
          >
            Loading product...
          </div>
        </main>

        <Footer />
      </>
    );
  }

  /* =========================================================
     NOT FOUND
  ========================================================= */

  if (
    error ||
    !product
  ) {
    return (
      <>
        <Navbar />

        <main
          className={
            styles.page
          }
        >
          <div
            className={
              styles.errorCard
            }
          >
            <h1>
              Product not found
            </h1>

            <p>
              {error ||
                "This product could not be found."}
            </p>

            <Link
              href="/store"
              className={
                styles.backLink
              }
            >
              <ArrowLeft
                size={17}
              />
              Back to Store
            </Link>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  /* =========================================================
     PRODUCT DATA
  ========================================================= */

  const price =
    Number.parseFloat(
      product.price
    );

  const total =
    price * quantity;

  const canBuy =
    product.stock > 0;

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <>
      <Navbar />

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
          <Link
            href="/store"
            className={
              styles.backLink
            }
          >
            <ArrowLeft
              size={17}
            />
            Back to Store
          </Link>

          <section
            className={
              styles.productCard
            }
          >
            {/* IMAGE */}

            <div
              className={
                styles.productImage
              }
            >
              <Image
                src={
                  product.image_url ||
                  "/images/placeholder.png"
                }
                alt={
                  product.name
                }
                fill
                sizes="(max-width: 800px) 100vw, 50vw"
                className={
                  styles.image
                }
                priority
              />
            </div>

            {/* INFORMATION */}

            <div
              className={
                styles.productInfo
              }
            >
              {product.category && (
                <span
                  className={
                    styles.category
                  }
                >
                  {
                    product.category
                      .name
                  }
                </span>
              )}

              <h1>
                {product.name}
              </h1>

              <p
                className={
                  styles.description
                }
              >
                {
                  product.description
                }
              </p>

              <div
                className={
                  styles.price
                }
              >
                GH₵
                {price.toLocaleString(
                  "en-GH",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </div>

              <span
                className={`${styles.stock} ${
                  canBuy
                    ? styles.stockAvailable
                    : styles.stockUnavailable
                }`}
              >
                {canBuy
                  ? `${product.stock} available`
                  : "Out of stock"}
              </span>

              {canBuy && (
                <>
                  {/* QUANTITY */}

                  <div
                    className={
                      styles.controls
                    }
                  >
                    <span>
                      Quantity
                    </span>

                    <div
                      className={
                        styles.quantity
                      }
                    >
                      <button
                        type="button"
                        disabled={
                          actionLoading ||
                          quantity <=
                            1
                        }
                        onClick={() =>
                          setQuantity(
                            (
                              current
                            ) =>
                              Math.max(
                                1,
                                current -
                                  1
                              )
                          )
                        }
                        aria-label="Decrease quantity"
                      >
                        <Minus
                          size={16}
                        />
                      </button>

                      <strong>
                        {quantity}
                      </strong>

                      <button
                        type="button"
                        disabled={
                          actionLoading ||
                          quantity >=
                            product.stock
                        }
                        onClick={() =>
                          setQuantity(
                            (
                              current
                            ) =>
                              Math.min(
                                product.stock,
                                current +
                                  1
                              )
                          )
                        }
                        aria-label="Increase quantity"
                      >
                        <Plus
                          size={16}
                        />
                      </button>
                    </div>
                  </div>

                  {/* TOTAL */}

                  <div
                    className={
                      styles.summary
                    }
                  >
                    <span>
                      Total
                    </span>

                    <strong>
                      GH₵
                      {total.toLocaleString(
                        "en-GH",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </strong>
                  </div>

                  {/* ACTIONS */}

                  <div
                    className={
                      styles.actions
                    }
                  >
                    <button
                      type="button"
                      className={
                        styles.cartButton
                      }
                      disabled={
                        actionLoading
                      }
                      onClick={
                        addToCart
                      }
                    >
                      <ShoppingCart
                        size={17}
                      />

                      Add to Cart
                    </button>

                    <button
                      type="button"
                      className={
                        styles.checkoutButton
                      }
                      disabled={
                        actionLoading
                      }
                      onClick={
                        buyNow
                      }
                    >
                      <CreditCard
                        size={17}
                      />

                      {actionLoading
                        ? "Preparing..."
                        : "Buy Now"}
                    </button>
                  </div>
                </>
              )}

              {notice && (
                <p
                  className={
                    styles.notice
                  }
                  role="status"
                >
                  {notice}
                </p>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}