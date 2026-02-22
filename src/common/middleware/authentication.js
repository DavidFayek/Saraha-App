import { VerifyToken } from "../utils/security/token.service.js"
import * as db_service from "../../DB/db.service.js";
import userModel from "../../DB/models/user.model.js";


export const authentication = async (req,res,next) =>{
    const {authorization} = req.headers

    if(!authorization){
        throw new Error("Token Not Exist");
        
    }

    const [Prefix,token] = authorization.split(" ") //[bearer,token]
    if(Prefix.toLowerCase() !== "bearer"){
        throw new Error("Invalid Token Prefix");
    }

    const decoded = VerifyToken({token,secret_key:"MVX"})

    if (!decoded || !decoded?.id){
        throw new Error("Invalid Token");
        
    }

    const user = await db_service.findOne({model:userModel, id: decoded.id, select:"-password"})
  if (!user){
    throw new Error("user Not Exist", {cause:400});
  }
    
    req.user = user
    next()
}