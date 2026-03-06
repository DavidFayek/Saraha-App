import { Router } from 'express';
import * as US from "./user.service.js"
import { authentication } from '../common/middleware/authentication.js';
import { authorization } from '../common/middleware/authorization.js';
import { RoleEnum } from '../common/enum/user.enum.js';
import { validation } from '../common/middleware/validation.js';
import * as UV from './user.validation.js';
import { multer_host, multer_local } from "../common/middleware/multer.js";
import { multer_enum } from '../common/enum/multer.enum.js';


const userRouter =  Router();


// userRouter.post("/signup",multer_host({custom_path: "General",custom_types: [...multer_enum.image]})
userRouter.post("/signup",multer_host(multer_enum.image)
  // .array("attachments",2),
  // .fields([
  //   { name: "attachment", maxCount: 1 },
  //   { name: "attachments", maxCount: 5 } ]),validation(UV.signUpSchema)
  .single("attachment"),US.signUp);
  
userRouter.post("/signup/gmail",US.signUpWithGmail)
userRouter.post("/signin",validation(UV.signInSchema),US.signIn)
userRouter.get("/profile",authentication,authorization([RoleEnum.admin]),US.getProfile)

export default userRouter