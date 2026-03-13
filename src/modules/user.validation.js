import joi from "joi";
import { GenderEnum } from "../common/enum/user.enum.js";
import { general_rules } from "../common/utils/generalRules.js";

export const signUpSchema = {
  body: joi.object({
    userName: joi.string().trim().min(5).required(),
    email: general_rules.email.required(),
    password: general_rules.password.required(),
    cPassword: joi.string().valid(joi.ref("password")).required(),
    gender: joi.string().valid(...Object.values(GenderEnum)).required(),
    phone: joi.string().required()
  }).required(),

  // file: general_rules.file.required()

  // files: joi.array().max(2).items(general_rules.file.required()).required()

  files: joi.object({
    attachment: joi.array().max(1).items(general_rules.file.required()).required(),
    attachments: joi.array().max(3).items(general_rules.file.required()).required(),
  }).required()
};

export const signInSchema = {
  body: joi.object({
    email: joi.string().email({
      tlds: { allow: true },
      minDomainSegments: 2,
      maxDomainSegments: 2
    }),
    password: joi.string().regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
  }).required()
};

export const shareProfileSchema = {
  params: joi.object({
    id: joi.string().length(24).hex().required(),
  }).required()
};

export const updateProfileSchema = {
  body: joi.object({
        FirstName: joi.string().trim().min(5),
        LastName: joi.string().trim().min(5),
        gender: joi.string().valid(...Object.values(GenderEnum)),
        phone: joi.string()
    }).required()
};

export const updatePasswordSchema = {
  body: joi.object({
        newPassword: general_rules.password.required(),
        cPassword: joi.string().valid(joi.ref("newPassword")),
        oldPassword: general_rules.password.required(),
    }).required()
};

