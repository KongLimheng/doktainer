"use client";

import { useEffect, useRef, type ReactNode } from "react";

const WRITE_ACTION_PATTERN =
  /(add|create|deploy|save|delete|remove|edit|issue|renew|revoke|restart|stop|start|install|uninstall|reinstall|rebuild|reset|prune|sync|check all|toggle|generate|verify|test|restore|backup|reboot|terminal|choose domain)/i;

function markButtonLikeElement(element: HTMLElement) {
  if (element.dataset.rbacReadonlyDisabled === "true") {
    return;
  }

  element.dataset.rbacReadonlyDisabled = "true";

  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    element.dataset.rbacReadonlyOriginalDisabled = String(element.disabled);
    element.disabled = true;
    return;
  }

  element.dataset.rbacReadonlyOriginalAriaDisabled =
    element.getAttribute("aria-disabled") ?? "";
  element.dataset.rbacReadonlyOriginalTabIndex = String(element.tabIndex);
  element.dataset.rbacReadonlyOriginalPointerEvents =
    element.style.pointerEvents;
  element.dataset.rbacReadonlyOriginalOpacity = element.style.opacity;
  element.setAttribute("aria-disabled", "true");
  element.tabIndex = -1;
  element.style.pointerEvents = "none";
  element.style.opacity = "0.55";
}

function restoreMarkedElement(element: HTMLElement) {
  if (element.dataset.rbacReadonlyDisabled !== "true") {
    return;
  }

  delete element.dataset.rbacReadonlyDisabled;

  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    element.disabled = element.dataset.rbacReadonlyOriginalDisabled === "true";
    delete element.dataset.rbacReadonlyOriginalDisabled;
    return;
  }

  const previousAriaDisabled = element.dataset.rbacReadonlyOriginalAriaDisabled;
  if (previousAriaDisabled) {
    element.setAttribute("aria-disabled", previousAriaDisabled);
  } else {
    element.removeAttribute("aria-disabled");
  }

  const previousTabIndex = Number(element.dataset.rbacReadonlyOriginalTabIndex);
  if (!Number.isNaN(previousTabIndex)) {
    element.tabIndex = previousTabIndex;
  }

  element.style.pointerEvents =
    element.dataset.rbacReadonlyOriginalPointerEvents ?? "";
  element.style.opacity = element.dataset.rbacReadonlyOriginalOpacity ?? "";
  delete element.dataset.rbacReadonlyOriginalAriaDisabled;
  delete element.dataset.rbacReadonlyOriginalTabIndex;
  delete element.dataset.rbacReadonlyOriginalPointerEvents;
  delete element.dataset.rbacReadonlyOriginalOpacity;
}

function getElementActionText(element: HTMLElement) {
  return [
    element.getAttribute("title") ?? "",
    element.getAttribute("aria-label") ?? "",
    element instanceof HTMLInputElement ? element.value : "",
    element.textContent ?? "",
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldDisableElement(element: HTMLElement) {
  if (element.dataset.rbacAllowReadonly === "true") {
    return false;
  }

  if (element instanceof HTMLButtonElement) {
    if (element.type === "submit") {
      return true;
    }

    const classNames = element.className;
    if (
      typeof classNames === "string" &&
      /(btn-primary|btn-danger|btn-success)/.test(classNames)
    ) {
      return true;
    }
  }

  return WRITE_ACTION_PATTERN.test(getElementActionText(element));
}

function disableWriteControls(scope: HTMLElement) {
  const writeControls = scope.querySelectorAll<HTMLElement>(
    "button, a.btn, input[type='submit'], input[type='button']",
  );

  const formsToLock = new Set<HTMLFormElement>();

  for (const control of writeControls) {
    if (!shouldDisableElement(control)) {
      continue;
    }

    markButtonLikeElement(control);

    const parentForm = control.closest("form");
    if (parentForm) {
      formsToLock.add(parentForm);
    }
  }

  for (const form of formsToLock) {
    const editableFields = form.querySelectorAll<HTMLElement>(
      "input:not([type='hidden']):not([type='button']):not([type='submit']), select, textarea",
    );
    editableFields.forEach(markButtonLikeElement);
  }
}

interface ReadOnlyActionScopeProps {
  enabled: boolean;
  children: ReactNode;
}

export default function ReadOnlyActionScope({
  enabled,
  children,
}: ReadOnlyActionScopeProps) {
  const scopeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) {
      return;
    }

    const clearScope = () => {
      scope
        .querySelectorAll<HTMLElement>("[data-rbac-readonly-disabled='true']")
        .forEach(restoreMarkedElement);
    };

    if (!enabled) {
      clearScope();
      return;
    }

    disableWriteControls(scope);

    const observer = new MutationObserver(() => {
      disableWriteControls(scope);
    });

    observer.observe(scope, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "title", "aria-label", "disabled"],
    });

    return () => {
      observer.disconnect();
      clearScope();
    };
  }, [enabled]);

  return <div ref={scopeRef}>{children}</div>;
}
