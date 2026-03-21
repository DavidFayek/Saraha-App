import joi from "joi";
import mongoose from "mongoose";

export const general_rules = {
  email: joi.string().email({
    tlds: { allow: true },
    minDomainSegments: 2,
    maxDomainSegments: 2
  }),

  password: joi
    .string()
    .pattern(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),

  cPassword: joi.string().valid(joi.ref("password")),

  id: joi.string().custom((value, helper) => {
    const isValid = mongoose.Types.ObjectId.isValid(value);
    return isValid ? value : helper.message("inValid id");
  }),

  file: joi
    .object({
      fieldname: joi.string().required(),
      originalname: joi.string().required(),
      encoding: joi.string().required(),
      mimetype: joi.string().required(),
      destination: joi.string(),
      filename: joi.string(),
      path: joi.string(),
      size: joi.number().required()
    })
    .messages({
      "any.required": "file is required"
    })
};
