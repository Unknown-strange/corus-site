"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  UserCircle2,
  User,
  ShoppingCart,
  FileText,
  Calendar,
  Shield,
  LifeBuoy,
  LogOut,
} from "lucide-react";

import {
  useState,
  useEffect,
  useRef,
} from "react";

import styles from "./Navbar.module.css";

/* =========================================================
   MAIN NAVIGATION
========================================================= */

const links = [
  {
    name: "Home",
    href: "/",
  },
  {
    name: "Our Gallery",
    href: "/gallery",
  },
  {
    name: "Rentals",
    href: "/rentals",
  },
  {
    name: "Store",
    href: "/store",
  },
  {
    name: "Booking",
    href: "/booking/session",
  },
];

/* =========================================================
   USER DROPDOWN
========================================================= */

const dropdownItems = [
  {
    icon: ShoppingCart,
    label: "My Cart",
    href: "/cart",
  },
  {
    icon: FileText,
    label: "My Requests",
    href: "/requests",
  },
  {
    icon: Calendar,
    label: "My Bookings",
    href: "/booking",
  },
  {
    icon: Shield,
    label: "Admin",
    href: "/admin",
  },
  {
    icon: LifeBuoy,
    label: "Contact Support",
    href: "/support",
  },
];

export default function Navbar() {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    dropdownOpen,
    setDropdownOpen,
  ] = useState(false);

  const [
    mobileDropdownOpen,
    setMobileDropdownOpen,
  ] = useState(false);

  const pathname =
    usePathname();

  const router =
    useRouter();

  const dropdownRef =
    useRef<HTMLDivElement>(
      null
    );

  const mobileDropdownRef =
    useRef<HTMLDivElement>(
      null
    );

  const [
    user,
    setUser,
  ] = useState<{
    username: string;
    firstName?: string;
  } | null>(null);

  /* =========================================================
     LOAD USER
  ========================================================= */

  useEffect(() => {
    const storedUser =
      localStorage.getItem(
        "user"
      );

    if (storedUser) {
      try {
        setUser(
          JSON.parse(
            storedUser
          )
        );
      } catch {
        setUser(null);
      }
    }
  }, []);

  /* =========================================================
     CLOSE DROPDOWNS ON OUTSIDE CLICK
  ========================================================= */

  useEffect(() => {
    const handleClickOutside =
      (event: MouseEvent) => {
        const target =
          event.target as Node;

        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(
            target
          )
        ) {
          setDropdownOpen(false);
        }

        if (
          mobileDropdownRef.current &&
          !mobileDropdownRef.current.contains(
            target
          )
        ) {
          setMobileDropdownOpen(
            false
          );
        }
      };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /* =========================================================
     MENU HELPERS
  ========================================================= */

  const toggleMenu =
    () => {
      setIsOpen(
        (current) => !current
      );
    };

  const closeMenu =
    () => {
      setIsOpen(false);
    };

  /*
   * Exact path matching keeps the active state correct.
   *
   * /booking/session is treated independently from
   * /booking, which remains My Bookings.
   */
  const isCurrent = (
    href: string
  ) => {
    if (href === "/") {
      return pathname === "/";
    }

    return (
      pathname === href ||
      pathname.startsWith(
        `${href}/`
      )
    );
  };

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout =
    () => {
      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "user"
      );

      setUser(null);

      setDropdownOpen(false);

      setMobileDropdownOpen(
        false
      );

      setIsOpen(false);

      router.push("/");
    };

  const userInitial =
    user?.username?.[0]?.toUpperCase() ||
    "?";

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <header
      className={
        styles.header
      }
    >
      <nav
        className={
          styles.nav
        }
      >
        {/* =====================================================
            HAMBURGER
        ===================================================== */}

        <button
          type="button"
          className={
            styles.mobileButton
          }
          onClick={
            toggleMenu
          }
          aria-label={
            isOpen
              ? "Close menu"
              : "Open menu"
          }
          aria-expanded={
            isOpen
          }
        >
          <div
            className={`${styles.hamburgerWrapper} ${
              isOpen
                ? styles.open
                : ""
            }`}
          >
            <span
              className={
                styles.line
              }
            />

            <span
              className={
                styles.line
              }
            />

            <span
              className={
                styles.line
              }
            />
          </div>
        </button>

        {/* =====================================================
            MOBILE USER
        ===================================================== */}

        {user ? (
          <div
            className={
              styles.mobileUser
            }
            ref={
              mobileDropdownRef
            }
          >
            <button
              type="button"
              className={
                styles.mobileUserAvatar
              }
              onClick={() =>
                setMobileDropdownOpen(
                  (current) =>
                    !current
                )
              }
              aria-expanded={
                mobileDropdownOpen
              }
            >
              <div
                className={
                  styles.avatarCircle
                }
              >
                {userInitial}
              </div>

              <span
                className={
                  styles.userName
                }
              >
                {user.username}
              </span>
            </button>

            {mobileDropdownOpen && (
              <div
                className={
                  styles.mobileDropdown
                }
              >
                <div
                  className={
                    styles.dropdownHeader
                  }
                >
                  <User
                    size={18}
                    className={
                      styles.dropdownIcon
                    }
                  />

                  <span>
                    Welcome back,
                  </span>
                </div>

                <div
                  className={
                    styles.dropdownUsername
                  }
                >
                  {user.username}
                </div>

                <button
                  type="button"
                  className={
                    styles.dropdownSignOut
                  }
                  onClick={
                    handleLogout
                  }
                >
                  <LogOut
                    size={18}
                  />

                  Sign out
                </button>

                <div
                  className={
                    styles.dropdownDivider
                  }
                />

                {dropdownItems.map(
                  (item) => {
                    const Icon =
                      item.icon;

                    return (
                      <Link
                        key={
                          item.label
                        }
                        href={
                          item.href
                        }
                        className={
                          styles.dropdownItem
                        }
                        onClick={() =>
                          setMobileDropdownOpen(
                            false
                          )
                        }
                      >
                        <Icon
                          size={18}
                        />

                        {
                          item.label
                        }
                      </Link>
                    );
                  }
                )}
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className={
              styles.mobileLogin
            }
          >
            <UserCircle2
              size={20}
            />

            <span>
              Log In
            </span>
          </Link>
        )}

        {/* =====================================================
            DESKTOP CENTER
        ===================================================== */}

        <div
          className={
            styles.navCenter
          }
        >
          <ul
            className={
              styles.desktopMenu
            }
          >
            {links.map(
              (link) => {
                const active =
                  isCurrent(
                    link.href
                  );

                return (
                  <li
                    key={
                      link.name
                    }
                  >
                    <Link
                      href={
                        link.href
                      }
                      className={`${styles.navLink} ${
                        active
                          ? styles.navLinkActive
                          : ""
                      }`}
                      aria-current={
                        active
                          ? "page"
                          : undefined
                      }
                    >
                      {
                        link.name
                      }
                    </Link>
                  </li>
                );
              }
            )}
          </ul>

          {/* ===================================================
              DESKTOP USER
          =================================================== */}

          {user ? (
            <div
              className={
                styles.desktopUser
              }
              ref={
                dropdownRef
              }
            >
              <button
                type="button"
                className={
                  styles.userAvatar
                }
                onClick={() =>
                  setDropdownOpen(
                    (current) =>
                      !current
                  )
                }
                aria-expanded={
                  dropdownOpen
                }
              >
                <div
                  className={
                    styles.avatarCircle
                  }
                >
                  {userInitial}
                </div>

                <span
                  className={
                    styles.userName
                  }
                >
                  {
                    user.username
                  }
                </span>
              </button>

              {dropdownOpen && (
                <div
                  className={
                    styles.dropdown
                  }
                >
                  <div
                    className={
                      styles.dropdownHeader
                    }
                  >
                    <User
                      size={18}
                      className={
                        styles.dropdownIcon
                      }
                    />

                    <span>
                      Welcome back,
                    </span>
                  </div>

                  <div
                    className={
                      styles.dropdownUsername
                    }
                  >
                    {
                      user.username
                    }
                  </div>

                  <button
                    type="button"
                    className={
                      styles.dropdownSignOut
                    }
                    onClick={
                      handleLogout
                    }
                  >
                    <LogOut
                      size={18}
                    />

                    Sign out
                  </button>

                  <div
                    className={
                      styles.dropdownDivider
                    }
                  />

                  {dropdownItems.map(
                    (item) => {
                      const Icon =
                        item.icon;

                      return (
                        <Link
                          key={
                            item.label
                          }
                          href={
                            item.href
                          }
                          className={
                            styles.dropdownItem
                          }
                          onClick={() =>
                            setDropdownOpen(
                              false
                            )
                          }
                        >
                          <Icon
                            size={18}
                          />

                          {
                            item.label
                          }
                        </Link>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className={
                styles.loginLink
              }
            >
              <UserCircle2
                size={20}
              />

              Log In
            </Link>
          )}
        </div>
      </nav>

      {/* =======================================================
          MOBILE MENU
      ======================================================= */}

      <div
        className={`${styles.mobileMenu} ${
          isOpen
            ? styles.open
            : ""
        }`}
      >
        <ul>
          {links.map(
            (link) => {
              const active =
                isCurrent(
                  link.href
                );

              return (
                <li
                  key={
                    link.name
                  }
                  onClick={
                    closeMenu
                  }
                >
                  <Link
                    href={
                      link.href
                    }
                    className={`${styles.mobileNavLink} ${
                      active
                        ? styles.navLinkActive
                        : ""
                    }`}
                    aria-current={
                      active
                        ? "page"
                        : undefined
                    }
                  >
                    {
                      link.name
                    }
                  </Link>
                </li>
              );
            }
          )}
        </ul>
      </div>
    </header>
  );
}