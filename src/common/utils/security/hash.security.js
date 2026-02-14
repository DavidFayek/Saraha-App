
import { hashSync,compareSync } from "bcrypt"
export const Hash = async({plainText,salt_rounds = 12} = {})=>{
     return hashSync(plainText,salt_rounds)
}

export const Compare = async({plainText,cipherText} = {})=>{
     return compareSync(plainText,cipherText)
}