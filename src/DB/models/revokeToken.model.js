import mongoose from "mongoose";

const revokeTokenSchema= new mongoose.Schema({
    tokenId:{
        type: String,
        required: true,
        trim:true
    },
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref:"user"
    },
    expiredAt:{
        type:Date,
        required:true
    },
    password:{
        type:String,
        required:function(){
            return this.provider == ProviderEnum.google ? false : true
        },
        trim:true,

    }
},{
    timestamps: true,
    strictQuery: true,
})

revokeTokenSchema.index({userId:1},{expiredAtSeconds:0})

const revokeTokenModel = mongoose.models.revokeToken || mongoose.model("revo",revokeTokenSchema)
export default revokeTokenModel