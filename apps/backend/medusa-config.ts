import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
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
