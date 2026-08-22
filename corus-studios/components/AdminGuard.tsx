"use client";

import {
  useEffect,
  useState,
} from "react";

import AdminNotFound from "./AdminNotFound";

type AccessState =
  | "checking"
  | "allowed"
  | "denied";

type MeResponse = {
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;

  role?: string;
  is_admin?: boolean;
  isAdmin?: boolean;
};

type Props = {
  children: React.ReactNode;
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

export default function AdminGuard({
  children,
}: Props) {
  const [
    access,
    setAccess,
  ] =
    useState<AccessState>(
      "checking"
    );

  useEffect(() => {
    let cancelled = false;

    const checkAccess =
      async () => {
        const token =
          localStorage.getItem(
            "access_token"
          );

        /*
         * No authentication at all:
         * immediately deny admin access.
         */
        if (!token) {
          if (!cancelled) {
            setAccess(
              "denied"
            );
          }

          return;
        }

        try {
          const response =
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

          if (
            response.status ===
              401 ||
            response.status ===
              403
          ) {
            localStorage.removeItem(
              "access_token"
            );

            localStorage.removeItem(
              "user"
            );

            if (!cancelled) {
              setAccess(
                "denied"
              );
            }

            return;
          }

          if (
            !response.ok
          ) {
            if (!cancelled) {
              setAccess(
                "denied"
              );
            }

            return;
          }

          const user =
            (await response.json()) as MeResponse;

          /*
           * Keep localStorage synchronized with
           * the authoritative /auth/me response.
           */
          localStorage.setItem(
            "user",
            JSON.stringify(
              {
                username:
                  user.username,
                firstName:
                  user.first_name,
                lastName:
                  user.last_name,
                email:
                  user.email,
                phone:
                  user.phone_number,
                role:
                  user.role,
                is_admin:
                  user.is_admin,
                isAdmin:
                  user.isAdmin,
              }
            )
          );

          if (!cancelled) {
            setAccess(
              isAdminUser(
                user
              )
                ? "allowed"
                : "denied"
            );
          }
        } catch (error) {
          console.error(
            "ADMIN ACCESS CHECK FAILED:",
            error
          );

          /*
           * Fail closed.
           *
           * If we cannot verify admin access,
           * don't render the admin dashboard.
           */
          if (!cancelled) {
            setAccess(
              "denied"
            );
          }
        }
      };

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * IMPORTANT:
   *
   * Admin pages are never rendered while access
   * is being checked.
   */
  if (
    access ===
    "checking"
  ) {
    return null;
  }

  if (
    access ===
    "denied"
  ) {
    return (
      <AdminNotFound />
    );
  }

  return (
    <>
      {children}
    </>
  );
}