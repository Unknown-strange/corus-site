"use client";

import { useSyncExternalStore } from "react";

/**
 * Reads the signed-in user that LogIn.tsx writes to localStorage under "user":
 *   { username, firstName, lastName, email, phone }
 *
 * Sign-in state is knowable only in the browser, so there are three states,
 * not two. "checking" is what the server renders and what the first client
 * render shows; screens should render something neutral for it rather than
 * flashing "please sign in" at someone who is in fact signed in.
 *
 * `useSyncExternalStore` rather than useEffect + setState, because the eslint
 * config treats `react-hooks/set-state-in-effect` as an error.
 */
export type SignedInUser = {
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

export type AuthState =
  | { status: "checking" }
  | { status: "signed-out" }
  | { status: "signed-in"; user: SignedInUser };

/**
 * REVIEW SWITCH — leave `false`.
 *
 * Set to `true` to make every gated screen render as though someone is signed
 * in, so layouts can be reviewed without a working login. It short-circuits
 * both snapshots, so the content is server-rendered too and there is no
 * "checking" flash. Set it back to `false` afterwards.
 */
export const PREVIEW_AS_SIGNED_IN = false;

const CHECKING: AuthState = { status: "checking" };
const SIGNED_OUT: AuthState = { status: "signed-out" };
const PREVIEW_USER: AuthState = {
  status: "signed-in",
  user: { username: "preview" },
};

/*
 * getSnapshot must return a stable reference while the underlying value is
 * unchanged — returning a fresh object each call makes React re-render forever.
 * These two cache the last parse, keyed on the raw string.
 */
let cachedJson: string | null = null;
let cachedState: AuthState = SIGNED_OUT;

function getSnapshot(): AuthState {
  if (PREVIEW_AS_SIGNED_IN) {
    return PREVIEW_USER;
  }

  const json = localStorage.getItem("user");

  if (json === cachedJson) {
    return cachedState;
  }

  cachedJson = json;

  if (!json) {
    cachedState = SIGNED_OUT;
    return cachedState;
  }

  try {
    cachedState = { status: "signed-in", user: JSON.parse(json) as SignedInUser };
  } catch {
    cachedState = SIGNED_OUT;
  }

  return cachedState;
}

function getServerSnapshot(): AuthState {
  return PREVIEW_AS_SIGNED_IN ? PREVIEW_USER : CHECKING;
}

/**
 * The one-shot notification is what moves the UI off "checking" after
 * hydration — React re-reads a snapshot only when the store says it changed.
 * The `storage` listener is the genuinely useful half: signing out in another
 * tab updates this one.
 */
function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  const id = window.setTimeout(onStoreChange, 0);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.clearTimeout(id);
  };
}

export function useAuthState(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
