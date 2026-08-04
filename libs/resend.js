import { configDotenv } from "dotenv";
import { Resend } from "resend";

configDotenv();

const resend = new Resend(process.env.API_KEY);

export default resend;