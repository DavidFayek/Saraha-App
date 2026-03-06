import Joi from "joi";
import { GenderEnum } from "../common/enum/user.enum.js";

export const signUpSchema = {
        body: Joi.object({
        userName:Joi.string().lowercase().required(),
        email: Joi.string().email().required(),
        password:Joi.string().min(7).required(),
        cPassword:Joi.valid(Joi.ref("password")).required(),
        phone:Joi.string().max(11).required(),
        gender: Joi.string().valid(GenderEnum.female,GenderEnum.male).required()

      }).required()
    }

export const signInSchema ={
        body: Joi.object({
          email:Joi.string().email().required(),
          password:Joi.string().required(),
      }).required(),

      // query: Joi.object({
      //   x: Joi.number().min(20).required(),
      // }).required()
      }