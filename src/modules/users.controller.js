import { Router } from "express";
import * as US from "./user.service.js";
import { authentication } from "../common/middleware/authentication.js";
import { authorization } from "../common/middleware/authorization.js";
import { RoleEnum } from "../common/enum/user.enum.js";
import { validation } from "../common/middleware/validation.js";
import * as UV from "./user.validation.js";
import { multer_host } from "../common/middleware/multer.js";
import { multer_enum } from "../common/enum/multer.enum.js";

const userRouter = Router();

userRouter.post(
  "/signup",
  multer_host(multer_enum.image).single("attachment"),
  validation(UV.signUpSchema),
  US.signUp
);
userRouter.patch("/confirm-email", validation(UV.confirmEmailSchema), US.confirmEmail);
userRouter.post("/signup/gmail", US.signUpWithGmail);
userRouter.post("/signin", validation(UV.signInSchema), US.signIn);
userRouter.post("/signin/confirm", validation(UV.confirmLoginSchema), US.confirmLogin);
userRouter.post("/2fa/enable", authentication, US.enableTwoFactor);
userRouter.patch(
  "/2fa/verify",
  authentication,
  validation(UV.twoFactorSchema),
  US.verifyEnableTwoFactor
);
userRouter.post("/forget-password", validation(UV.forgetPasswordSchema), US.forgetPassword);
userRouter.patch("/reset-password", validation(UV.resetPasswordSchema), US.resetPassword);
userRouter.get("/refresh-token", US.refresh_token);
userRouter.get("/profile", authentication, authorization([RoleEnum.admin, RoleEnum.user]), US.getProfile);
userRouter.get("/share-profile/:id", validation(UV.shareProfileSchema), US.shareProfile);
userRouter.patch(
  "/update-profile",
  authentication,
  validation(UV.updateProfileSchema),
  US.updateProfile
);
userRouter.patch(
  "/update-password",
  authentication,
  validation(UV.updatePasswordSchema),
  US.updatePassword
);
userRouter.post("/logout", authentication, US.logout);
userRouter.patch(
  "/upload-cover",
  authentication,
  multer_host(multer_enum.image).array("coverPicture", 2),
  US.uploadCoverPicture
);
userRouter.patch(
  "/upload-profile-picture",
  authentication,
  multer_host(multer_enum.image).single("profilePicture"),
  US.uploadProfilePicture
);
userRouter.delete("/remove-profile-picture", authentication, US.removeProfilePicture);

export default userRouter;
