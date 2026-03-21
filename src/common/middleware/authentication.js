import { VerifyToken } from "../utils/security/token.service.js";
import * as db_service from "../../DB/db.service.js";
import userModel from "../../DB/models/user.model.js";
import { ACCESS_SECRET_KEY, PREFIX } from "../../../config/config.service.js";
import { get, revoked_key } from "../../DB/redis/redis.service.js";

export const authentication = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    throw new Error("Token Not Exist", { cause: 401 });
  }

  const [tokenPrefix, token] = authorization.split(" ");

  if (tokenPrefix?.toLowerCase() !== PREFIX) {
    throw new Error("Invalid Token Prefix", { cause: 401 });
  }

  const decoded = VerifyToken({ token, secret_key: ACCESS_SECRET_KEY });

  if (!decoded || !decoded?.id) {
    throw new Error("Invalid Token Payload", { cause: 401 });
  }

  const revokedToken = await get(
    revoked_key({ userId: decoded.id, jti: decoded.jti })
  );

  if (revokedToken) {
    throw new Error("invalid Token revoked", { cause: 401 });
  }

  const user = await db_service.findOne({
    model: userModel,
    filter: { _id: decoded.id }
  });

  if (!user) {
    throw new Error("user Not Exist", { cause: 400 });
  }

  if (user?.changeCredential?.getTime() > decoded.iat * 1000) {
    throw new Error("invalid Token", { cause: 401 });
  }

  req.user = user;
  req.decoded = decoded;
  next();
};
