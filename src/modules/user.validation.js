import joi from "joi";
import { GenderEnum } from "../common/enum/user.enum.js";
import { general_rules } from "../common/utils/generalRules.js";

export const signUpSchema = {
  body: joi
    .object({
      userName: joi.string().trim().min(5).required(),
      email: general_rules.email.required(),
      password: general_rules.password.required(),
      cPassword: joi.string().valid(joi.ref("password")).required(),
      gender: joi.string().valid(...Object.values(GenderEnum)).required(),
      phone: joi.string().required()
    })
    .required()
};

export const confirmEmailSchema = {
  body: joi
    .object({
      email: general_rules.email.required(),
      code: joi.string().length(6).required()
    })
    .required()
};

export const signInSchema = {
  body: joi
    .object({
      email: general_rules.email.required(),
      password: general_rules.password.required()
    })
    .required()
};

export const confirmLoginSchema = {
  body: joi
    .object({
      email: general_rules.email.required(),
      code: joi.string().length(6).required(),
      verificationToken: joi.string().required()
    })
    .required()
};

export const twoFactorSchema = {
  body: joi
    .object({
      code: joi.string().length(6).required()
    })
    .required()
};

export const shareProfileSchema = {
  params: joi
    .object({
      id: general_rules.id.required()
    })
    .required()
};

export const updateProfileSchema = {
  body: joi
    .object({
      firstName: joi.string().trim().min(3),
      lastName: joi.string().trim().min(3),
      gender: joi.string().valid(...Object.values(GenderEnum)),
      phone: joi.string()
    })
    .required()
};

export const updatePasswordSchema = {
  body: joi
    .object({
      newPassword: general_rules.password.required(),
      cPassword: joi.string().valid(joi.ref("newPassword")).required(),
      oldPassword: general_rules.password.required()
    })
    .required()
};

export const forgetPasswordSchema = {
  body: joi
    .object({
      email: general_rules.email.required()
    })
    .required()
};

export const resetPasswordSchema = {
  body: joi
    .object({
      email: general_rules.email.required(),
      code: joi.string().length(6).required(),
      password: general_rules.password.required(),
      cPassword: joi.string().valid(joi.ref("password")).required()
    })
    .required()
};
