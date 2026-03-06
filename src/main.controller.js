import express from "express";
import multerMiddleware from "./middleware/multer.middleware";

const app = express();

app.get("/", multerMiddleware().single("file"), (req, res, next) => {
  console.log(req.file);
})