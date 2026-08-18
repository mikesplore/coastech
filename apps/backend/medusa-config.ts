import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const databaseUrl = process.env.DATABASE_URL || [
  "postgres://",
  encodeURIComponent(process.env.DB_USER || "postgres"),
  ":",
  encodeURIComponent(process.env.DB_PASSWORD || ""),
  "@",
  process.env.DB_HOST || "localhost",
  ":",
  process.env.DB_PORT || "5432",
  "/",
  process.env.DB_NAME || "medusa-backend",
].join("")

module.exports = defineConfig({
  projectConfig: {
    databaseUrl,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  modules: {
    payment: {
      resolve: "@medusajs/payment",
      options: {
        providers: [
          {
            resolve: "./src/providers/payment-paystack",
            id: "paystack",
            options: {
              secret_key: process.env.PAYSTACK_SECRET_KEY,
              public_key: process.env.PAYSTACK_PUBLIC_KEY,
              callback_url: process.env.PAYSTACK_CALLBACK_URL,
              test_mode: process.env.PAYSTACK_TEST_MODE !== "false",
              base_url: process.env.PAYSTACK_BASE_URL,
            },
          },
        ],
      },
    },
    specifications: {
      resolve: "./src/modules/specifications",
      definition: {
        isQueryable: true,
      },
    },
    compatibility: {
      resolve: "./src/modules/compatibility",
      definition: {
        isQueryable: true,
      },
    },
    promotions: {
      resolve: "./src/modules/promotions",
      definition: {
        isQueryable: true,
      },
    },
  },
})
