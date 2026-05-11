configDotenv();
import { configDotenv } from "dotenv";
import jwt from "jsonwebtoken";

export function signJwt(email,id,role){
    const token = jwt.sign({email,id,role},process.env.JWT_SECRET,{expiresIn:'10d'});
    return token;
}