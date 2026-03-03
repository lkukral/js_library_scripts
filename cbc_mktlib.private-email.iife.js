/*! Copyright (c) 2026 Cloudbridge Consulting GmbH. All rights reserved. */
"use strict";
var MktLib = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // .mktlib-build-GNAoWF/entry.ts
  var entry_exports = {};
  __export(entry_exports, {
    MktLib: () => MktLib,
    default: () => entry_default
  });

  // src/utils.ts
  var DEBUG = new URLSearchParams(window.location.search).get("debug") === "true";
  var log = (...args) => {
    if (DEBUG) console.log("[mktlib]", ...args);
  };
  var qs = (sel, root = document) => root.querySelector(sel);
  var qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // src/core.ts
  var registry = [];
  function registerFeature(f) {
    registry.push(f);
    registry.sort((a, b) => {
      var _a, _b;
      return ((_a = a.order) != null ? _a : 100) - ((_b = b.order) != null ? _b : 100);
    });
  }
  var bootstrapped = false;
  function bootstrap() {
    if (bootstrapped) return;
    bootstrapped = true;
    const debug = DEBUG;
    const log2 = log;
    const qs2 = qs;
    const qsa2 = qsa;
    const handle = (evtName) => (ev) => {
      const containers = qsa2("[data-form-id]");
      if (containers.length === 0) {
        return;
      }
      const relevant = registry.filter((f) => f.listensTo.includes(evtName));
      if (relevant.length === 0) return;
      for (const container of containers) {
        const formIdAttr = container.getAttribute("data-form-id") || void 0;
        const ctx = {
          container,
          event: ev,
          debug,
          ...formIdAttr ? { formId: formIdAttr } : {},
          utils: { qs: qs2, qsa: qsa2, log: log2 }
        };
        for (const f of relevant) {
          try {
            if (!f.isEnabled || f.isEnabled(container)) {
              f.run(ctx);
            }
          } catch (e) {
            log2(`Feature "${f.id}" threw:`, e);
          }
        }
      }
    };
    const events = [
      "d365mkt-beforeformload",
      "d365mkt-formrender",
      "d365mkt-afterformload",
      "d365mkt-formsubmit",
      "d365mkt-afterformsubmit"
    ];
    for (const e of events) {
      const options = e === "d365mkt-formsubmit" ? false : { passive: true };
      document.addEventListener(e, handle(e), options);
    }
    log2("bootstrap complete; listeners attached:", events.join(", "));
  }
  function listFeatures() {
    return registry.map((f) => {
      var _a;
      return { id: f.id, order: (_a = f.order) != null ? _a : 100, listensTo: f.listensTo.slice() };
    });
  }

  // src/runtime/private-email-sidecar.ts
  var DOMAIN_SET_GLOBAL_KEY = "__MKTLIB_PRIVATE_EMAIL_DOMAINS__";
  var DOMAIN_PROMISE_GLOBAL_KEY = "__MKTLIB_PRIVATE_EMAIL_DOMAINS_PROMISE__";
  var DOMAIN_LOADER_GLOBAL_KEY = "__MKTLIB_ENSURE_PRIVATE_EMAIL_DOMAINS__";
  var MAIN_BUNDLE_FILENAME = "cbc_mktlib.private-email.iife.js";
  var PRIVATE_EMAIL_SIDECAR_FILENAME = "cbc.private-email-domains.iife.min.js";
  var getPrivateDomainSet = () => {
    const source = globalThis[DOMAIN_SET_GLOBAL_KEY];
    if (!source) return null;
    if (source instanceof Set) return source;
    if (Array.isArray(source)) return new Set(source.map((item) => String(item).toLowerCase()));
    return null;
  };
  var resolveLibraryScriptSrc = () => {
    var _a;
    const current = document.currentScript;
    if ((current == null ? void 0 : current.src) && current.src.includes(MAIN_BUNDLE_FILENAME)) return current.src;
    const scripts = Array.from(document.querySelectorAll("script[src]"));
    for (let idx = scripts.length - 1; idx >= 0; idx -= 1) {
      const src = ((_a = scripts[idx]) == null ? void 0 : _a.src) || "";
      if (src.includes(MAIN_BUNDLE_FILENAME)) return src;
    }
    return null;
  };
  var sidecarUrlFromMktlibUrl = (mktlibUrl) => {
    const match = mktlibUrl.match(/cbc_mktlib\.private-email\.iife\.js(\?.*)?$/);
    if (!match) return null;
    const suffix = match[1] || "";
    return mktlibUrl.replace(/cbc_mktlib\.private-email\.iife\.js(\?.*)?$/, `${PRIVATE_EMAIL_SIDECAR_FILENAME}${suffix}`);
  };
  var ensurePrivateEmailDomainsLoaded = () => {
    const cached = getPrivateDomainSet();
    if (cached) return Promise.resolve(cached);
    const globalState = globalThis;
    const existingPromise = globalState[DOMAIN_PROMISE_GLOBAL_KEY];
    if (existingPromise instanceof Promise) {
      return existingPromise;
    }
    const promise = new Promise((resolve) => {
      const currentSet = getPrivateDomainSet();
      if (currentSet) {
        resolve(currentSet);
        return;
      }
      const ownSrc = resolveLibraryScriptSrc();
      if (!ownSrc) {
        log("[privemail] unable to resolve mktlib script URL for sidecar loading");
        resolve(null);
        return;
      }
      const sidecarUrl = sidecarUrlFromMktlibUrl(ownSrc);
      if (!sidecarUrl) {
        log("[privemail] unable to derive sidecar URL from mktlib script URL");
        resolve(null);
        return;
      }
      const settle = () => resolve(getPrivateDomainSet());
      const existingScript = document.querySelector(`script[src="${sidecarUrl}"]`) || document.querySelector(`script[data-mktlib-sidecar="private-email-domains"][src="${sidecarUrl}"]`);
      if (existingScript) {
        const alreadyLoaded = getPrivateDomainSet();
        if (alreadyLoaded) {
          resolve(alreadyLoaded);
          return;
        }
        existingScript.addEventListener("load", settle, { once: true });
        existingScript.addEventListener(
          "error",
          () => {
            log("[privemail] sidecar load failed", sidecarUrl);
            resolve(null);
          },
          { once: true }
        );
        setTimeout(settle, 0);
        return;
      }
      const script = document.createElement("script");
      script.src = sidecarUrl;
      script.defer = true;
      script.async = false;
      script.setAttribute("data-mktlib-sidecar", "private-email-domains");
      script.addEventListener(
        "load",
        () => {
          log("[privemail] sidecar loaded", sidecarUrl);
          settle();
        },
        { once: true }
      );
      script.addEventListener(
        "error",
        () => {
          log("[privemail] sidecar load failed", sidecarUrl);
          resolve(null);
        },
        { once: true }
      );
      document.head.appendChild(script);
    });
    globalState[DOMAIN_PROMISE_GLOBAL_KEY] = promise;
    return promise;
  };
  var installPrivateEmailDomainLoader = () => {
    const globalState = globalThis;
    if (!globalState[DOMAIN_LOADER_GLOBAL_KEY]) {
      globalState[DOMAIN_LOADER_GLOBAL_KEY] = ensurePrivateEmailDomainsLoaded;
    }
  };

  // src/features/private-email.ts
  var DEFAULT_ERROR_DE = "Es sind keine privaten E-Mail Adressen erlaubt.";
  var DEFAULT_ERROR_EN = "Private email addresses are not allowed.";
  var getPrivateDomainSet2 = () => {
    const source = globalThis[DOMAIN_SET_GLOBAL_KEY];
    if (!source) return null;
    if (source instanceof Set) return source;
    if (Array.isArray(source)) return new Set(source.map((item) => String(item).toLowerCase()));
    return null;
  };
  var ensurePrivateDomainSidecar = () => {
    const loader = globalThis[DOMAIN_LOADER_GLOBAL_KEY];
    if (typeof loader !== "function") return;
    try {
      void loader();
    } catch (e) {
    }
  };
  var privateEmailEnabled = false;
  var privateEmailErrorMessage = "";
  var initPrivateEmailValidation = (options) => {
    const nextGlobalMessage = typeof (options == null ? void 0 : options.errorMessage) === "string" ? options.errorMessage.trim() : "";
    if (nextGlobalMessage) {
      privateEmailErrorMessage = nextGlobalMessage;
    }
    if (privateEmailEnabled) return;
    privateEmailEnabled = true;
    ensurePrivateDomainSidecar();
  };
  var getErrorMessage = (container) => {
    const custom = (container.getAttribute("data-privemailerrormessage") || "").trim();
    if (custom) return custom;
    if (privateEmailErrorMessage) return privateEmailErrorMessage;
    const lang = (document.documentElement.lang || "").toLowerCase();
    return lang.startsWith("de") ? DEFAULT_ERROR_DE : DEFAULT_ERROR_EN;
  };
  var extractDomain = (email) => {
    const at = email.lastIndexOf("@");
    if (at <= 0 || at === email.length - 1) return null;
    const domain = email.slice(at + 1).trim().toLowerCase().replace(/\.+$/, "");
    return domain || null;
  };
  var findEmailInputs = (form) => {
    const inputs = qsa("input[name]", form);
    return inputs.filter((input) => input.name.toLowerCase().includes("emailaddress"));
  };
  var hasValidEmailDomain = (container, form) => {
    if (!privateEmailEnabled) {
      return true;
    }
    const blockedDomains = getPrivateDomainSet2();
    if (!blockedDomains) {
      ensurePrivateDomainSidecar();
      log("[privemail] no blocked-domain sidecar loaded; skip private email validation");
      return true;
    }
    const inputs = findEmailInputs(form);
    if (inputs.length === 0) {
      log('[privemail] no inputs matching name*="emailaddress" found');
      return true;
    }
    const message = getErrorMessage(container);
    let firstInvalid = null;
    for (const input of inputs) {
      const value = (input.value || "").trim();
      if (!value) {
        input.setCustomValidity("");
        continue;
      }
      const domain = extractDomain(value);
      if (!domain) {
        input.setCustomValidity("");
        continue;
      }
      if (blockedDomains.has(domain)) {
        input.setCustomValidity(message);
        if (!firstInvalid) firstInvalid = input;
        log(`[privemail] blocked domain "${domain}" on input name="${input.name}"`);
      } else {
        input.setCustomValidity("");
        log(`[privemail] allowed domain "${domain}" on input name="${input.name}"`);
      }
    }
    if (firstInvalid) {
      firstInvalid.reportValidity();
      log("[privemail] submission blocked due to private email domain");
      return false;
    }
    return true;
  };
  var validatePrivateEmails = (container, form, ev) => {
    if (!hasValidEmailDomain(container, form)) {
      ev.preventDefault();
    }
  };
  var bindEmailResetOnChange = (form) => {
    if (form.dataset.mktlibPrivEmailResetBound === "true") return;
    const handler = (ev) => {
      const target = ev.target;
      if (!target || target.tagName.toLowerCase() !== "input") return;
      if (!target.name || !target.name.toLowerCase().includes("emailaddress")) return;
      target.setCustomValidity("");
    };
    form.addEventListener("input", handler);
    form.addEventListener("change", handler);
    form.dataset.mktlibPrivEmailResetBound = "true";
  };
  installPrivateEmailDomainLoader();
  globalThis.mktlibPrivateEmail = {
    init: initPrivateEmailValidation,
    hasValidEmailDomain
  };
  globalThis.validatePrivateEmailBeforeNext = (payload) => {
    var _a;
    const container = payload == null ? void 0 : payload.container;
    if (!container) return true;
    const form = (_a = payload.form) != null ? _a : container.querySelector("form.marketingForm");
    if (!form) return true;
    return hasValidEmailDomain(container, form);
  };
  var privateEmailFeature = {
    id: "private-email-validation",
    listensTo: ["d365mkt-formsubmit"],
    order: 60,
    run: ({ container, event }) => {
      if (!privateEmailEnabled) return;
      const form = qs("form.marketingForm", container);
      if (!form) {
        log("[privemail] no form found below container \u2013 abort");
        return;
      }
      bindEmailResetOnChange(form);
      validatePrivateEmails(container, form, event);
    }
  };
  var private_email_default = privateEmailFeature;

  // .mktlib-build-GNAoWF/entry.ts
  registerFeature(private_email_default);
  bootstrap();
  var MktLib = {
    registerFeature,
    bootstrap,
    listFeatures
  };
  var entry_default = MktLib;
  return __toCommonJS(entry_exports);
})();
