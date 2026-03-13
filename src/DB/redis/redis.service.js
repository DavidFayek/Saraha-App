import { redis_client } from "./redis.connect.js";
export const revoked_key =({userId, jti})=>{
  return `revokeToken:${userId}:${jti}`
}

export const get_key =({userId, jti})=>{
  return `revokeToken:${userId}`
}

export const setValue = async ({ key, value, ttl }) => {
  try {
    const data = typeof value == "string" ? value : JSON.stringify(value);
    return ttl
      ? await redis_client.set(key, data, { EX: ttl })
      : await redis_client.set(key, data);
  } catch (error) {
    console.log(error, "fail to set operation");
  }
};

export const update = async ({ key, value, ttl }) => {
  try {
    if (!await redis_client.exists(key)) return 0;
    return await setValue({ key, value, ttl });
  } catch (error) {
    console.log(error, "fail to update operation");
  }
};

export const get = async (key) => {
  try {
    try {
      return JSON.parse(await redis_client.get(key));
    } catch (error) {
      return await redis_client.get(key);
    }
  } catch (error) {
    console.log(error, "fail to get operation");
  }
};

export const ttl = async (key) => {
  try {
    return await redis_client.ttl(key);
  } catch (error) {
    console.log(error, "fail to get TTL operation");
  }
};

export const exists = async (key) => {
  try {
    return await redis_client.exists(key);
  } catch (error) {
    console.log(error, "fail to get exists operation");
  }
};

export const expire = async ({ key, ttl }) => {
  try {
    return await redis_client.expire(key, ttl);
  } catch (error) {
    console.log(error, "fail to get exists operation");
  }
};

export const deleteKey = async (key) => {
  try {
    if (!key.length) return 0;
    return await redis_client.del(key);
  } catch (error) {
    console.log(error, "fail to get deleteKey operation");
  }
};

export const keys = async (pattern) => {
  try {
    return await redis_client.keys(`${pattern}*`);
  } catch (error) {
    console.log(error, "fail to get keys operation");
  }
};