import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";
const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGOURL}`
    );
    console.log("mongoose connect");
  } catch (error) {
    console.log("Conection error in mongodb", error);
  }
};

export default connectDB;
