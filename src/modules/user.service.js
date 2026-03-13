import { ProviderEnum } from "../common/enum/user.enum.js";
import { successResponse } from "../common/utils/response.js";
import { decrypt, encrypt } from "../common/utils/security/encrypt.security.js";
import { Compare, Hash } from "../common/utils/security/hash.security.js";
import { GenerateToken, VerifyToken } from "../common/utils/security/token.service.js";
import { ACCESS_SECRET_KEY, REFRESH_SECRET_KEY, PREFIX } from "../../config/config.service.js";
import * as db_service from "../DB/db.service.js";
import userModel from "../DB/models/user.model.js";
import jwt from "jsonwebtoken";
import {v4 as uuidv4} from "uuid"
import {OAuth2Client} from 'google-auth-library';
import { SALT_ROUNDS } from "../../config/config.service.js";
import joi from "joi";
import cloudinary from "../common/utils/security/cloudinary.js";
import {randomUUID} from "crypto"
import revokeTokenModel from "../DB/models/revokeToken.model.js";
import { deleteKey, get, get_key, keys, revoked_key, setValue } from "../DB/redis/redis.service.js";
const asyncHandler = () =>{
  
}
export const signUp = async (req, res, next) => {
  const { userName, email, password, cPassword, gender, phone } = req.body

  const {secure_url,public_id} = await cloudinary.uploader
    .upload(req.file.path,{
      folder:"saraha_app",
      // public_id:"david"
      // use_filename: true
      // unique_filename: false
      resource_type:"auto"
    })


  if (password !== cPassword) {
    throw new Error("invalid password", { cause: 400 });
  }

  // let arr_paths = []
  //   console.log(req.files, "after");

  //   for (const file of req.files.attachments) {
  //       arr_paths.push(file.path)
  //   }

  if (await db_service.findOne({ model: userModel, filter: { email } })) {
    throw new Error("email already exist", { cause: 409 });
  }

  const user = await db_service.create({
    model: userModel,
    data: { userName,
      email,
      password:await Hash({plainText: password, salt_rounds: SALT_ROUNDS}),
      gender,
      phone:encrypt(phone),
  // profilePicture: req.files.attachment[0].path,
  profilePicture: {secure_url,public_id},
      coverPicture: arr_paths
    }
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


// const access_token = GenerateToken(
//   { id: user._id, email: user.email },
//   "MVX",
//   { expiresIn: 60 }
    // noTimestamp:true
      // issuer:"http://localhost:3000",
      // audience:"http://localhost:4000",
      // notBefore: "1h",
      // jwtid:uuidv4()
// );

    // successResponse({res,message:"Success Sign in", data:{access_token}})

    const jwid = randomUUID()

    const access_token = GenerateToken({
    payload: {
      id: user._id,
      email: user.email
    },
    secret_key: ACCESS_SECRET_KEY,
    options: {
      expiresIn: 60 * 5,
      jwtid:jwid
    }
  });

  const refresh_token = GenerateToken({
    payload: {
      id: user._id,
      email: user.email
    },
    secret_key: REFRESH_SECRET_KEY,
    options: {
      expiresIn: "1y",
      jwid:jwid
    }
  });

  successResponse({
    res,
    message: "success signin",
    data: { access_token, refresh_token }
  });
};
// export const getProfile = async (req, res, next) => {
//   // const { id } = req.params

//   const { authorization } = req.headers

//   const decoded = jwt.verify(authorization, "MVX")

//   const user = await db_service.findById({
//     model: userModel,
//     id: decoded.id,
//     select: "-password"
//   })
//   if (!user) {
//     throw new Error("user not exist", { cause: 400 });
//   }
//   successResponse({ res, message: "success signin", data: user })
// }
export const getProfile = async (req, res, next) => {

  const key = `profile::${req.user._id}`
  const userExist = await get(key)
  if (userExist){
    return successResponse({res, data: userExist})
  }
  await setValue({key, value: req.user, ttl: 60 * 5})

  successResponse({res,data: req.user})
}
export const refresh_token = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    throw new Error("token not found");
  }

  const [prefix, token] = authorization.split(" ");

  if (prefix != PREFIX) {
    throw new Error("inValid token prefix");
  }

  const decoded = VerifyToken({ token, secret_key: REFRESH_SECRET_KEY });

  if (!decoded || !decoded?.id) {
    throw new Error("inValid token");
  }

  const user = await db_service.findOne({
    model: userModel,
    filter: { _id: decoded.id }
  });

  if (!user) {
    throw new Error("user not exist", { cause: 400 });
  }

  const revokeToken = await db_service.findOne({
     model: revokeTokenModel,
     filter: { tokenId: decoded.jti }
  })
    if(revokeToken){
      throw new Error("invalid Token revoked");
      
    }

  const access_token = GenerateToken({
    payload: {
      id: user._id,
      email: user.email
    },
    secret_key: ACCESS_SECRET_KEY,
    options: {
      expiresIn: 60 * 5,
    }
  });

  successResponse({ res, data: access_token });
};
export const shareProfile = async (req,res,next)=>{

    const {id} = req.params

    const user = await db_service.findOne({
        model:userModel,
        id,
        select:"firstName lastName profilePicture coverPicture profileVisits"
    })

    if(!user){
        throw new Error("User not found")
    }

    // زيادة الزيارة
    user.profileVisits += 1
    await user.save()

    const response={
        firstName:user.firstName,
        lastName:user.lastName,
        profilePicture:user.profilePicture,
        coverPicture:user.coverPicture
    }

    // admin فقط يرى العدد
    if(req.user?.role === RoleEnum.admin){
        response.profileVisits = user.profileVisits
    }

    return res.json({
        message:"Profile fetched",
        user:response
    })
}
export const updateProfile = async (req, res, next) => {

  let { FirstName,lastName, gender, phone } = req.body;

  if(phone){
    phone = encrypt(phone)
  }

  const user = await db_service.findOneAndUpdate({
    model: userModel,
    filter:{_id:req.user._id},
    update: {FirstName,lastName, gender, phone }
  });

  if (!user) {
    throw new Error("user not exist yet");
  }

  await deleteKey(`profile::${req.user._id}`)

  successResponse({ res, data: user });
};
export const updatePassword = async (req, res, next) => {

  let { oldPassword, newPassword } = req.body;
  if (!Compare({plain_text:oldPassword,chiper_text:req.user.password})){
    throw new Error("inValid old Password");
  }
  const hash = Hash({plain_text: newPassword})
  req.user.password = hash
  await req.user.save()

  successResponse({ res});
};
export const logout = async (req, res, next) => {

  const {flag}=req.query
  if(flag === "all"){
    req.user.changeCredential = new Date()
    await req.user.save()
    await deleteKey(await keys(get_key({userId:req.user._id})))

    // await db_service.deleteMany({
    //   model: revokeTokenModel,
    //   filter: {userId: req.user._id}
    // })



  }else{

      
    await setValue({
      key: revoked_key({userId:req.user._id, jti:req.decoded.jti}),
      value: `${req.decoded.jti}`,
      ttl: req.decoded.exp - Math.floor(Date.now() / 1000)
    })

    // await db_service.create({
    //   model:revokeTokenModel,
    //   data:{
    //     tokenId: req.decoded.jti,
    //     userId: req.user._id,
    //     expiredAt: new Date(req.decoded.exp * 1000)
    //   }
    // })
  }
  successResponse({ res});
};

export const uploadCoverPicture = async (req,res,next)=>{
    
    const user = req.user

    const existing = user.coverPicture?.length || 0
    const uploaded = req.files?.length || 0

    if(existing + uploaded !== 2){
        throw new Error("Total cover pictures must equal 2")
    }

    const cover = []

    for(const file of req.files){

        const {secure_url,public_id} = await cloudinary.uploader.upload(file.path,{
            folder:`saraha/users/${user._id}/cover`
        })

        cover.push({secure_url,public_id})
    }

    user.coverPicture.push(...cover)

    await user.save()

    return res.json({message:"Cover uploaded",cover:user.coverPicture})
}

export const uploadProfilePicture = async (req,res,next)=>{

    const user = req.user

    if(!req.file){
        throw new Error("Image required")
    }

    const {secure_url,public_id} = await cloudinary.uploader.upload(req.file.path,{
        folder:`saraha/users/${user._id}/profile`
    })

    if(user.profilePicture){
        user.gallery.push(user.profilePicture)
    }

    user.profilePicture={
        secure_url,
        public_id
    }

    await user.save()

    return res.json({
        message:"Profile picture updated",
        profile:user.profilePicture
    })
}

export const removeProfilePicture = async (req,res,next)=>{

    const user = req.user

    if(!user.profilePicture){
        throw new Error("No profile image")
    }

    await cloudinary.uploader.destroy(user.profilePicture.public_id)

    user.profilePicture = null

    await user.save()

    return res.json({
        message:"Profile picture removed"
    })
}
