import nodemailer from "nodemailer";
import { EMAIL, PASSWORD } from "../../../../config/config.service.js";
import { resolve } from "node:path";

export const sendEmail = async ({
  to,
  subject = "",
  html = "",
  attachments = []
} = {}) => {

  try {

    const transporter = nodemailer.createTransport({

      service: "gmail",

      auth: {
        user: EMAIL,
        pass: PASSWORD
      }

    });

    const info = await transporter.sendMail({

      from: `david <${EMAIL}>`,
      to: to,
      subject: subject,
      html: html,
      attachments: attachments

    });

    console.log("Message sent:", info.messageId);

    return info.accepted.length ? true : false;

  } catch (error) {

    console.log("Email error:", error);
    return false;

  }

};


export const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000);
}