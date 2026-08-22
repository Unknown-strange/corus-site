"use client";

import {
  useSyncExternalStore,
} from "react";

export type SignedInUser = {
  username: string;

  firstName?: string;

  lastName?: string;

  email?: string;

  phone?: string;

  role?: string;

  is_admin?: boolean;

  isAdmin?: boolean;
};

export type AuthState =
  | {
      status: "checking";
    }
  | {
      status: "signed-out";
    }
  | {
      status: "signed-in";
      user: SignedInUser;
    };

export const PREVIEW_AS_SIGNED_IN =
  false;

const CHECKING: AuthState = {
  status: "checking",
};

const SIGNED_OUT: AuthState = {
  status: "signed-out",
};

const PREVIEW_USER: AuthState = {
  status: "signed-in",

  user: {
    username:
      "preview",
  },
};

let cachedJson:
  string | null =
  null;

let cachedState: AuthState =
  SIGNED_OUT;

function getSnapshot(): AuthState {
  if (
    PREVIEW_AS_SIGNED_IN
  ) {
    return PREVIEW_USER;
  }

  const json =
    localStorage.getItem(
      "user"
    );

  if (
    json ===
    cachedJson
  ) {
    return cachedState;
  }

  cachedJson =
    json;

  if (!json) {
    cachedState =
      SIGNED_OUT;

    return cachedState;
  }

  try {
    cachedState = {
      status:
        "signed-in",

      user:
        JSON.parse(
          json
        ) as SignedInUser,
    };
  } catch {
    cachedState =
      SIGNED_OUT;
  }

  return cachedState;
}

function getServerSnapshot(): AuthState {
  return PREVIEW_AS_SIGNED_IN
    ? PREVIEW_USER
    : CHECKING;
}

function subscribe(
  onStoreChange: () => void
) {
  window.addEventListener(
    "storage",
    onStoreChange
  );

  const id =
    window.setTimeout(
      onStoreChange,
      0
    );

  return () => {
    window.removeEventListener(
      "storage",
      onStoreChange
    );

    window.clearTimeout(
      id
    );
  };
}

export function useAuthState(): AuthState {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
}