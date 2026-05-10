configDotenv();
import { configDotenv } from "dotenv";
import jwt from "jsonwebtoken";

export async function signJwt(email,id){
    const token = await jwt.sign({email,id},process.env.JWT_SECRET,{expiresIn:'10d'});
    return token;
}