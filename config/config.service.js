import { config } from "dotenv";
import { resolve } from "node:path";

const NODE_ENV = process.env.NODE_ENV;

const env_paths = {
  development: ".env.development",
  production: ".env.production"
};

config({ path: resolve(`config/${env_paths[NODE_ENV]}`) });

export const PORT = process.env.PORT;
export const DB_URI = process.env.DB_URI;
export const SALT_ROUNDS = process.env.SALT_ROUNDS;
export const ACCESS_SECRET_KEY = process.env.ACCESS_SECRET_KEY;
export const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY;
export const PREFIX = process.env.PREFIX;
export const REDIS_URL = process.env.REDIS_URL;

// export const PORT = process.env.PORT
// export const PORT = process.env.PORT
// export const PORT = process.env.PORT