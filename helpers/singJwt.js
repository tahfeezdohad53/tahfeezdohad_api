configDotenv();
import { configDotenv } from "dotenv";
import jwt from "jsonwebtoken";

export function signJwt(user){
    const token = jwt.sign(user,process.env.JWT_SECRET,{expiresIn:'10d'});
    return token;
}