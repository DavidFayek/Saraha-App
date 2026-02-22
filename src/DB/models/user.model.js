import mongoose from "mongoose";
import {RoleEnum, GenderEnum, ProviderEnum } from "../../common/enum/user.enum.js";

const userSchema= new mongoose.Schema({
    firstName:{
        type: String,
        required: true,
        minLength: 3,
        maxLength: 20,
        trim:true
    },
    lastName:{
        type: String,
        required: true,
        minLength: 3,
        maxLength: 20,
        trim:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        trim: true,
        lowercase:true
    },
    password:{
        type:String,
        required:function(){
            return this.provider == ProviderEnum.google ? false : true
        },
        trim:true,

    },
    age:Number,
    phone: {
  type: String
},
    gender:{
        type:String,
        enum:Object.values(GenderEnum),
        default:GenderEnum.male
    },
    profilePicture: String,
    confirmed: Boolean,
    provider:{
        type:String,
        enum:Object.values(ProviderEnum),
        default: ProviderEnum.system
    },
    role:{
        type:String,
        enum:Object.values(RoleEnum),
        default: RoleEnum.user
    }


},{
    timestamps: true,
    strictQuery: true,
    toJSON:{virtual:true}
})

userSchema.virtual("userName")
.get(function() {
    return this.firstName + "" + this.lastName
})
.set(function(v){
    const [firstName,lastName] = v.split(" ")
    this.set ({
        firstName:firstName,
        lastName:lastName
    })
})
const userModel = mongoose.models.user || mongoose.model("user",userSchema)

export default userModel