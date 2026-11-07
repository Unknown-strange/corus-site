"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AccessState = "checking" | "allowed" | "denied";

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function isAdminUser(user: MeResponse): boolean {
  if (user.is_admin === true || user.isAdmin === true) {
    return true;
  }
  if (typeof user.role === "string") {
    const normalizedRole = user.role.trim().toLowerCase();
    if (normalizedRole === "admin" || normalizedRole === "staff") {
      return true;
    }
  }
  return false;
}

function getCachedAdminUser(): boolean {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as MeResponse;
    return isAdminUser(parsed);
  } catch {
    return false;
  }
}

export default function AdminGuard({ children }: Props) {
  const router = useRouter();
  const [access, setAccess] = useState<AccessState>("checking");

  useEffect(() => {
    let cancelled = false;

    const denyAndRedirect = () => {
      if (!cancelled) {
        setAccess("denied");
        router.replace("/login");
      }
    };

    const checkAccess = async () => {
      const token = localStorage.getItem("access_token");

      if (!token) {
        denyAndRedirect();
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          denyAndRedirect();
          return;
        }

        if (!response.ok) {
          if (getCachedAdminUser()) {
            if (!cancelled) setAccess("allowed");
            return;
          }
          denyAndRedirect();
          return;
        }

        const user = (await response.json()) as MeResponse;

        localStorage.setItem(
          "user",
          JSON.stringify({
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            phone: user.phone_number,
            role: user.role,
            is_admin: user.is_admin,
            isAdmin: user.isAdmin,
          })
        );

        if (isAdminUser(user)) {
          if (!cancelled) setAccess("allowed");
        } else {
          denyAndRedirect();
        }
      } catch (error) {
        console.error("ADMIN ACCESS CHECK FAILED:", error);

        if (getCachedAdminUser()) {
          if (!cancelled) setAccess("allowed");
          return;
        }

        denyAndRedirect();
      }
    };

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (access === "checking" || access === "denied") {
    return null;
  }

  return <>{children}</>;
}
