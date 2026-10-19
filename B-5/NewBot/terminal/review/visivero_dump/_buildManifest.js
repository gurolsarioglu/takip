self.__BUILD_MANIFEST = {
  "/": [
    "static/chunks/0gybh9h1ew-~e.js"
  ],
  "/[exchange]/[marketType]/[[...symbol]]": [
    "static/chunks/072yrq~3k8~~v.js"
  ],
  "/_error": [
    "static/chunks/0xa89jmulabni.js"
  ],
  "/certificate": [
    "static/chunks/10_-16qjuoqqc.js"
  ],
  "/certificate/[slug]": [
    "static/chunks/090vt~xjwly.3.js"
  ],
  "/forgot-password": [
    "static/chunks/0inv-whxjlnlf.js"
  ],
  "/panel-popup": [
    "static/chunks/0ajt~q9s6c.98.js"
  ],
  "/playground": [
    "static/chunks/0rheo2u.gqobz.js"
  ],
  "/signin/[[...index]]": [
    "static/chunks/14p5e_jdbkq7a.js"
  ],
  "/sso-callback": [
    "static/chunks/0gx0equ4fiom1.js"
  ],
  "/workspace-manager": [
    "static/chunks/0e-q7oc3f4ccq.js"
  ],
  "__rewrites": {
    "afterFiles": [
      {
        "source": "/:nextInternalLocale(tr|en|zh\\-CN)/symbols",
        "destination": "/:nextInternalLocale/api/symbols"
      },
      {
        "source": "/:nextInternalLocale(tr|en|zh\\-CN)/data-api/:path*"
      },
      {
        "source": "/:nextInternalLocale(tr|en|zh\\-CN)/script-runtime/:path*"
      },
      {
        "source": "/relay/:path*"
      }
    ],
    "beforeFiles": [
      {
        "source": "/:nextInternalLocale(tr|en|zh\\-CN)/certificate/assets/:path*",
        "destination": "/:nextInternalLocale/api/certificate/assets/:path*"
      },
      {
        "source": "/icons/symbols/:file",
        "destination": "/api/symbol-logo/:file"
      }
    ],
    "fallback": []
  },
  "sortedPages": [
    "/",
    "/_app",
    "/_error",
    "/api/auth/sync-user",
    "/api/billing/cancel-renewal",
    "/api/billing/summary",
    "/api/bot-messages",
    "/api/certificate/assets/[[...path]]",
    "/api/data/track-active-pair",
    "/api/hello",
    "/api/listings",
    "/api/script-runtime/cache-lookup",
    "/api/script-runtime/cache-lookup-batch",
    "/api/script-runtime/candles",
    "/api/script-runtime/candles-batch",
    "/api/script-runtime/execute",
    "/api/script-runtime/templates",
    "/api/symbol-logo/[file]",
    "/api/symbol-stats",
    "/api/symbols",
    "/api/watchlists",
    "/api/watchlists/[id]",
    "/api/watchlists/[id]/clear",
    "/api/watchlists/[id]/items",
    "/certificate",
    "/certificate/[slug]",
    "/forgot-password",
    "/panel-popup",
    "/playground",
    "/signin/[[...index]]",
    "/sso-callback",
    "/workspace-manager",
    "/[exchange]/[marketType]/[[...symbol]]"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()