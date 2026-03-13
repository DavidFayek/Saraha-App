
import express from 'express';
import checkConnectionDB from './DB/ConnectionDB.js';
import userRouter from './modules/users.controller.js';
import cors from "cors"
import { PORT } from '../config/config.service.js';
import { connectRedis } from "./DB/redis/redis.connect.js";

const app = express();
const port = PORT



const bootstrap = async () =>{
 app.use(cors(),express.json())

app.get("/",(req,res,next) =>{
    res.status(200).json({message:`Welcome on Saraha App`})
})
checkConnectionDB()
connectRedis();



app.use("/uploads", express.static("uploads"));
app.use("/users",userRouter)
app.use("{/*demo}",(req,res,next) =>{
    throw new Error(`URL ${req.originalUrl} Not Found`,{cause:404});
})

app.use((err,req,res,next) =>{
    res.status(err.cause||500).json({message:err.message, stack:err.stack})
})
 
 app.listen(port, ()=>{
    console.log(`Server is Running on port ${port}`)
 })
}

export default bootstrap