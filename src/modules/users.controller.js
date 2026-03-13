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
userRouter.get("/refresh-token", US.refresh_token);
userRouter.get("/profile",authentication,authorization([RoleEnum.admin]),US.getProfile)
userRouter.get("/share-profile/:id", validation(UV.shareProfileSchema), US.shareProfile);
userRouter.patch("/update-profile", authentication,validation(UV.updateProfileSchema), US.updateProfile);
userRouter.patch("/update-password",authentication ,validation(UV.updatePasswordSchema), US.updatePassword);
userRouter.post("/logout",authentication ,US.logout);
userRouter.patch("/upload-cover",authentication,multer_host(multer_enum.image).array("coverPicture",2),US.uploadCoverPicture)
userRouter.patch("/upload-profile-picture",authentication,multer_host(multer_enum.image).single("profilePicture"),US.uploadProfilePicture)
userRouter.delete("/remove-profile-picture",authentication,US.removeProfilePicture)





export default userRouter