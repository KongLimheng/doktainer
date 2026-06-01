"use client";

import { useEffect, useState } from "react";
import { getToken, getUser, redirectToLogin, type UserInfo } from "@/lib/api";
import { addAuthStateListener } from "@/lib/auth-events";

export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const syncCurrentUser = () => {
      setCurrentUser(getUser());
    };

    syncCurrentUser();
    window.addEventListener("storage", syncCurrentUser);
    const removeAuthStateListener = addAuthStateListener(syncCurrentUser);

    return () => {
      window.removeEventListener("storage", syncCurrentUser);
      removeAuthStateListener();
    };
  }, []);

  return currentUser;
}

export function useRequireAuth() {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const syncAuth = () => {
      const authenticated = Boolean(getToken());
      setHasToken(authenticated);

      if (!authenticated) {
        redirectToLogin();
      }
    };

    syncAuth();
    return addAuthStateListener(syncAuth);
  }, []);

  return hasToken;
}
