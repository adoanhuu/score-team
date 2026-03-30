import { onRequestGet as __api_contest_connect_js_onRequestGet } from "/app/functions/api/contest/connect.js"
import { onRequestPost as __api_contest_connect_js_onRequestPost } from "/app/functions/api/contest/connect.js"
import { onRequestPost as __api_contest_users_js_onRequestPost } from "/app/functions/api/contest/users.js"
import { onRequestGet as __api_users_configuration_js_onRequestGet } from "/app/functions/api/users/configuration.js"
import { onRequestPut as __api_users_configuration_js_onRequestPut } from "/app/functions/api/users/configuration.js"
import { onRequestPost as __api_users_password_js_onRequestPost } from "/app/functions/api/users/password.js"
import { onRequestGet as __api_users_sessions_js_onRequestGet } from "/app/functions/api/users/sessions.js"
import { onRequestPut as __api_users_sessions_js_onRequestPut } from "/app/functions/api/users/sessions.js"
import { onRequest as __api_contest_connect_js_onRequest } from "/app/functions/api/contest/connect.js"
import { onRequest as __api_contest_users_js_onRequest } from "/app/functions/api/contest/users.js"
import { onRequest as __api_users_configuration_js_onRequest } from "/app/functions/api/users/configuration.js"
import { onRequest as __api_users_password_js_onRequest } from "/app/functions/api/users/password.js"
import { onRequest as __api_users_sessions_js_onRequest } from "/app/functions/api/users/sessions.js"
import { onRequestPost as __api_login_js_onRequestPost } from "/app/functions/api/login.js"
import { onRequestGet as __api_users_js_onRequestGet } from "/app/functions/api/users.js"
import { onRequestPost as __api_users_js_onRequestPost } from "/app/functions/api/users.js"
import { onRequest as __api_login_js_onRequest } from "/app/functions/api/login.js"
import { onRequest as __api_users_js_onRequest } from "/app/functions/api/users.js"

export const routes = [
    {
      routePath: "/api/contest/connect",
      mountPath: "/api/contest",
      method: "GET",
      middlewares: [],
      modules: [__api_contest_connect_js_onRequestGet],
    },
  {
      routePath: "/api/contest/connect",
      mountPath: "/api/contest",
      method: "POST",
      middlewares: [],
      modules: [__api_contest_connect_js_onRequestPost],
    },
  {
      routePath: "/api/contest/users",
      mountPath: "/api/contest",
      method: "POST",
      middlewares: [],
      modules: [__api_contest_users_js_onRequestPost],
    },
  {
      routePath: "/api/users/configuration",
      mountPath: "/api/users",
      method: "GET",
      middlewares: [],
      modules: [__api_users_configuration_js_onRequestGet],
    },
  {
      routePath: "/api/users/configuration",
      mountPath: "/api/users",
      method: "PUT",
      middlewares: [],
      modules: [__api_users_configuration_js_onRequestPut],
    },
  {
      routePath: "/api/users/password",
      mountPath: "/api/users",
      method: "POST",
      middlewares: [],
      modules: [__api_users_password_js_onRequestPost],
    },
  {
      routePath: "/api/users/sessions",
      mountPath: "/api/users",
      method: "GET",
      middlewares: [],
      modules: [__api_users_sessions_js_onRequestGet],
    },
  {
      routePath: "/api/users/sessions",
      mountPath: "/api/users",
      method: "PUT",
      middlewares: [],
      modules: [__api_users_sessions_js_onRequestPut],
    },
  {
      routePath: "/api/contest/connect",
      mountPath: "/api/contest",
      method: "",
      middlewares: [],
      modules: [__api_contest_connect_js_onRequest],
    },
  {
      routePath: "/api/contest/users",
      mountPath: "/api/contest",
      method: "",
      middlewares: [],
      modules: [__api_contest_users_js_onRequest],
    },
  {
      routePath: "/api/users/configuration",
      mountPath: "/api/users",
      method: "",
      middlewares: [],
      modules: [__api_users_configuration_js_onRequest],
    },
  {
      routePath: "/api/users/password",
      mountPath: "/api/users",
      method: "",
      middlewares: [],
      modules: [__api_users_password_js_onRequest],
    },
  {
      routePath: "/api/users/sessions",
      mountPath: "/api/users",
      method: "",
      middlewares: [],
      modules: [__api_users_sessions_js_onRequest],
    },
  {
      routePath: "/api/login",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_login_js_onRequestPost],
    },
  {
      routePath: "/api/users",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_users_js_onRequestGet],
    },
  {
      routePath: "/api/users",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_users_js_onRequestPost],
    },
  {
      routePath: "/api/login",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_login_js_onRequest],
    },
  {
      routePath: "/api/users",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_users_js_onRequest],
    },
  ]