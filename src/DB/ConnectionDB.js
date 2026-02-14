import mongoose from "mongoose"

const checkConnectionDB = async() =>{
    await mongoose.connect("mongodb://127.0.0.1:27017/sarahaApp",{serverSelectionTimeoutMS:5000})
    .then(()=>{
        console.log(`DB Connected Successfully`)
    })
    .catch((error) =>{
        console.log(error,"DB Faild to connected")
    })
}

export default checkConnectionDB