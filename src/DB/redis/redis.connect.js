import { createClient } from "redis";
import { REDIS_URL } from "../../../config/config.service.js";

export const redis_client = createClient({
  url: REDIS_URL
});

export const connectRedis = async () => {
  await redis_client.connect()
    .then(() => {
      console.log("Connected to Redis successfully!");
    }).catch((err) => {
      console.error("Failed to connect to Redis:", err);
    });
};