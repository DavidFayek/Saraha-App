import { VerifyToken } from "../utils/security/token.service.js"
import * as db_service from "../../DB/db.service.js";
import userModel from "../../DB/models/user.model.js";
import { ACCESS_SECRET_KEY, PREFIX } from "../../../config/config.service.js";
import { get, revoked_key } from "../../DB/redis/redis.service.js";


export const authentication = async (req,res,next) =>{
    const {authorization} = req.headers

    if(!authorization){
        throw new Error("Token Not Exist");
        
    }

    const [Prefix,token] = authorization.split(" ") //[bearer,token]
    if(Prefix.toLowerCase() !== PREFIX){
        throw new Error("Invalid Token Prefix");
    }

    const decoded = VerifyToken({token,secret_key:ACCESS_SECRET_KEY})
    if (!decoded || !decoded?.id){
        throw new Error("Invalid Token Payload  ");
        
    }

    const user = await db_service.findOne({model:userModel, id: decoded.id, select:"-password"})
  if (!user){
    throw new Error("user Not Exist", {cause:400});
  }

  if(user?.changeCredential?.getTime() > decoded.iat * 1000){
    throw new Error("invalid Token");
  }
  const revokeToken = await get(revoked_key({userId:req.user._id, jti:req.decoded.jti}))


  if(revokeToken){
    throw new Error("invalid Token revoked");
    
  }

    req.user = user
    req.decoded =decoded
    next()
}