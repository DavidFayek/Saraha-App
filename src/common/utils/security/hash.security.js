
import { hashSync,compareSync } from "bcrypt"
export const Hash = async({plainText,salt_rounds = 12} = {})=>{
     return hashSync(plainText,Number(salt_rounds))
}

export const Compare = async({plainText,cipherText} = {})=>{
     return compareSync(plainText,cipherText)
}