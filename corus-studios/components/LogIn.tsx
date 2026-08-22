"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  User,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

import styles from "./LogIn.module.css";

type Notice = {
  type:
    | "success"
    | "error";

  text: string;
};

type MeResponse = {
  username: string;

  first_name?: string;

  last_name?: string;

  email?: string;

  phone_number?: string;

  role?: string;

  is_admin?: boolean;

  isAdmin?: boolean;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

function isAdminUser(
  user: MeResponse
) {
  if (
    user.is_admin ===
    true
  ) {
    return true;
  }

  if (
    user.isAdmin ===
    true
  ) {
    return true;
  }

  if (
    typeof user.role ===
      "string" &&
    user.role
      .trim()
      .toLowerCase() ===
      "admin"
  ) {
    return true;
  }

  return false;
}

function getLoginError(
  data: unknown
) {
  if (
    data &&
    typeof data ===
      "object"
  ) {
    const value =
      data as {
        detail?: unknown;
        message?: unknown;
      };

    if (
      Array.isArray(
        value.detail
      )
    ) {
      const messages =
        value.detail
          .map(
            (item) => {
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
            }
          )
          .filter(
            (
              item
            ): item is string =>
              Boolean(item)
          );

      if (
        messages.length >
        0
      ) {
        return messages.join(
          ", "
        );
      }
    }

    if (
      typeof value.detail ===
      "string"
    ) {
      return value.detail;
    }

    if (
      typeof value.message ===
      "string"
    ) {
      return value.message;
    }
  }

  return (
    "Login failed. Please check your credentials."
  );
}

export default function LogIn() {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    notice,
    setNotice,
  ] =
    useState<Notice | null>(
      null
    );

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setNotice(
      null
    );

    const form =
      event.currentTarget;

    const formData =
      new FormData(
        form
      );

    const username =
      String(
        formData.get(
          "username"
        ) || ""
      ).trim();

    const password =
      String(
        formData.get(
          "password"
        ) || ""
      );

    if (
      !username ||
      !password
    ) {
      setNotice({
        type:
          "error",
        text:
          "Please fill in all fields.",
      });

      return;
    }

    setLoading(
      true
    );

    try {
      const loginResponse =
        await fetch(
          `${API_BASE}/auth/login`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                username,
                password,
              }),
          }
        );

      const loginText =
        await loginResponse.text();

      let loginData:
        unknown = null;

      if (
        loginText
      ) {
        try {
          loginData =
            JSON.parse(
              loginText
            );
        } catch {
          loginData =
            loginText;
        }
      }

      if (
        !loginResponse.ok
      ) {
        throw new Error(
          getLoginError(
            loginData
          )
        );
      }

      const token =
        (
          loginData as {
            access_token?: string;
          }
        )?.access_token;

      if (!token) {
        throw new Error(
          "Login succeeded, but no access token was returned."
        );
      }

      localStorage.setItem(
        "access_token",
        token
      );

      /* =====================================================
         GET AUTHORITATIVE USER
      ===================================================== */

      const meResponse =
        await fetch(
          `${API_BASE}/auth/me`,
          {
            method:
              "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,

              Accept:
                "application/json",
            },

            cache:
              "no-store",
          }
        );

      const meText =
        await meResponse.text();

      let userData:
        MeResponse | null =
        null;

      if (
        meText
      ) {
        try {
          userData =
            JSON.parse(
              meText
            ) as MeResponse;
        } catch {
          userData =
            null;
        }
      }

      if (
        !meResponse.ok ||
        !userData
      ) {
        throw new Error(
          "Login succeeded, but we could not retrieve your account details."
        );
      }

      /* =====================================================
         SAVE USER
      ===================================================== */

      const admin =
        isAdminUser(
          userData
        );

      localStorage.setItem(
        "user",
        JSON.stringify(
          {
            username:
              userData.username,

            firstName:
              userData.first_name,

            lastName:
              userData.last_name,

            email:
              userData.email,

            phone:
              userData.phone_number,

            role:
              userData.role,

            is_admin:
              userData.is_admin,

            isAdmin:
              userData.isAdmin,
          }
        )
      );

      /* =====================================================
         REDIRECT
      ===================================================== */

      setNotice({
        type:
          "success",

        text:
          admin
            ? "Administrator login successful! Opening dashboard..."
            : "Login successful! Redirecting...",
      });

      window.setTimeout(
        () => {
          router.replace(
            admin
              ? "/admin"
              : "/"
          );
        },
        700
      );
    } catch (
      error: unknown
    ) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      if (
        error instanceof
        TypeError
      ) {
        setNotice({
          type:
            "error",

          text:
            "Unable to connect to the server. Please try again later.",
        });
      } else if (
        error instanceof
        Error
      ) {
        setNotice({
          type:
            "error",

          text:
            error.message,
        });
      } else {
        setNotice({
          type:
            "error",

          text:
            "Something went wrong while logging in.",
        });
      }

      /*
       * Don't leave a half-authenticated session around.
       */
      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "user"
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  return (
    <div
      className={
        styles.loginContainer
      }
    >
      <div
        className={
          styles.header
        }
      >
        <Image
          src="/icons/Profile.png"
          alt=""
          width={51}
          height={51}
          className={
            styles.icon
          }
        />

        <h1
          className={
            styles.title
          }
        >
          Log In
        </h1>
      </div>

      <p
        className={
          styles.subtitle
        }
      >
        Log in to continue.
      </p>

      <form
        className={
          styles.form
        }
        onSubmit={
          handleSubmit
        }
      >
        <div
          className={
            styles.inputWrapper
          }
        >
          <User
            className={
              styles.inputIcon
            }
            size={20}
          />

          <input
            className={`${styles.field} ${styles.fieldWithIcon}`}
            type="text"
            name="username"
            placeholder="Username"
            aria-label="Username"
            autoComplete="username"
            required
          />
        </div>

        <div
          className={`${styles.inputWrapper} ${styles.passwordWrapper}`}
        >
          <Lock
            className={
              styles.inputIcon
            }
            size={20}
          />

          <input
            className={`${styles.field} ${styles.fieldWithIcon} ${styles.passwordField}`}
            type={
              showPassword
                ? "text"
                : "password"
            }
            name="password"
            placeholder="Password"
            aria-label="Password"
            autoComplete="current-password"
            required
          />

          <button
            type="button"
            className={
              styles.togglePassword
            }
            onClick={() =>
              setShowPassword(
                (
                  current
                ) =>
                  !current
              )
            }
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
          >
            {showPassword ? (
              <EyeOff
                size={20}
              />
            ) : (
              <Eye
                size={20}
              />
            )}
          </button>
        </div>

        <Link
          href="/forgot-password"
          className={
            styles.forgot
          }
        >
          Forgot Password?
        </Link>

        <button
          className={
            styles.submit
          }
          type="submit"
          disabled={
            loading
          }
        >
          {loading
            ? "Logging in..."
            : "Log In"}
        </button>
      </form>

      <p
        className={
          styles.footer
        }
      >
        Don&rsquo;t have an account?{" "}

        <Link
          href="/signup"
          className={
            styles.footerLink
          }
        >
          Sign Up
        </Link>
      </p>

      {notice && (
        <p
          className={`${styles.notice} ${
            notice.type ===
            "success"
              ? styles.successNotice
              : styles.errorNotice
          }`}
          role="alert"
        >
          {
            notice.text
          }
        </p>
      )}
    </div>
  );
}