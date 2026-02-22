import { ProviderEnum } from "../common/enum/user.enum.js";
import { successResponse } from "../common/utils/response.js";
import { decrypt, encrypt } from "../common/utils/security/encrypt.security.js";
import { Compare, Hash } from "../common/utils/security/hash.security.js";
import { GenerateToken, VerifyToken } from "../common/utils/security/token.service.js";
import * as db_service from "../DB/db.service.js";
import userModel from "../DB/models/user.model.js";
import jwt from "jsonwebtoken";
import {v4 as uuidv4} from "uuid"
import {OAuth2Client} from 'google-auth-library';
import { SALT_ROUNDS } from "../../config/config.service.js";

 

const asyncHandler = () =>{
  
}


export const signUp = async (req, res, next) => {
  const { userName, email, password, cPassword, gender, phone } = req.body

  if (password !== cPassword) {
    throw new Error("invalid password", { cause: 400 });
  }

  if (await db_service.findOne({ model: userModel, filter: { email } })) {
    throw new Error("email already exist", { cause: 409 });
  }

  const user = await db_service.create({
    model: userModel,
    data: { userName, email, password:await Hash({plainText: password, salt_rounds: SALT_ROUNDS}), gender, phone:encrypt(phone) }
  })

  successResponse({ res, status: 201, message: "success signup", data: user })
}



export const signUpWithGmail = async (req, res, next) => {
  const {idToken} = req.body



const GOOGLE_CLIENT_ID =
  "820618978766-rruqq3t8o684rfhsgi6dqhn5sb79p2va.apps.googleusercontent.com";

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const ticket = await client.verifyIdToken({
  idToken,
  audience: GOOGLE_CLIENT_ID,
});
  const payload = ticket.getPayload();
  const {email,email_verified, name, picture} = payload

  let user = await db_service.findOne({model:userModel, filter:{email}})
  if (!user){
    user = await db_service.create({
      model:userModel,
      data:{
        email,
        confirmed: email_verified,
        userName : name,
        profilePicture: picture,
        provider:ProviderEnum.google
      }
    })
  }

  if (user.provider == ProviderEnum.system){
    throw new Error("Please login on System only",{cause:400});
  }

const access_token = GenerateToken(
  { id: user._id, email: user.email },
  "MVX",
  { expiresIn: "1d" }
);
    successResponse({res,message:"Success Sign in", data:{access_token}})


}

export const signIn = async(req,res,next)=>{
    const {email,password} =req.body
const user = await db_service.findOne({
    model: userModel,
    filter: {
      email,
      provider: ProviderEnum.system
    }
  })
    if(!user){
      throw new Error("User Not Exist",{cause:409});
    }
    if(!Compare({plainText:password,cipherText:user.password})){
            throw new Error("Invalid Password",{cause:409});
    }


const access_token = GenerateToken(
  { id: user._id, email: user.email },
  "MVX",
  { expiresIn: 60 }
    // noTimestamp:true
      // issuer:"http://localhost:3000",
      // audience:"http://localhost:4000",
      // notBefore: "1h",
      // jwtid:uuidv4()
);

    successResponse({res,message:"Success Sign in", data:{access_token}})
}







export const getProfile = async (req, res, next) => {
  // const { id } = req.params

  const { authorization } = req.headers

  const decoded = jwt.verify(authorization, "MVX")

  const user = await db_service.findById({
    model: userModel,
    id: decoded.id,
    select: "-password"
  })
  if (!user) {
    throw new Error("user not exist", { cause: 400 });
  }
  successResponse({ res, message: "success signin", data: user })
}
