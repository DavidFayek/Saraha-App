import { randomUUID } from "crypto";
import { OAuth2Client } from "google-auth-library";
import cloudinary from "../common/utils/security/cloudinary.js";
import * as db_service from "../DB/db.service.js";
import userModel from "../DB/models/user.model.js";
import revokeTokenModel from "../DB/models/revokeToken.model.js";
import { ProviderEnum, RoleEnum } from "../common/enum/user.enum.js";
import { successResponse } from "../common/utils/response.js";
import { decrypt, encrypt } from "../common/utils/security/encrypt.security.js";
import { Compare, Hash } from "../common/utils/security/hash.security.js";
import { GenerateToken, VerifyToken } from "../common/utils/security/token.service.js";
import {
  ACCESS_SECRET_KEY,
  REFRESH_SECRET_KEY,
  PREFIX,
  SALT_ROUNDS
} from "../../config/config.service.js";
import {
  deleteKey,
  get,
  get_key,
  keys,
  revoked_key,
  setValue
} from "../DB/redis/redis.service.js";
import { generateOtp, sendEmail } from "../common/utils/email/send.email.js";

const GOOGLE_CLIENT_ID =
  "820618978766-rruqq3t8o684rfhsgi6dqhn5sb79p2va.apps.googleusercontent.com";

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_BLOCK_MINUTES = 5;
const OTP_TTL_SECONDS = 60 * 5;

const issueTokens = (user) => {
  const tokenId = randomUUID();

  const access_token = GenerateToken(
    {
      id: user._id,
      email: user.email
    },
    ACCESS_SECRET_KEY,
    {
      expiresIn: 60 * 5,
      jwtid: tokenId
    }
  );

  const refresh_token = GenerateToken(
    {
      id: user._id,
      email: user.email
    },
    REFRESH_SECRET_KEY,
    {
      expiresIn: "1y",
      jwtid: tokenId
    }
  );

  return { access_token, refresh_token };
};

const sendOtpMail = async ({ to, subject, htmlPrefix }) => {
  const otp = generateOtp();

  const sent = await sendEmail({
    to,
    subject,
    html: `<p>${htmlPrefix} <b>${otp}</b></p>`
  });

  if (!sent) {
    throw new Error("failed to send email otp", { cause: 500 });
  }

  return {
    otp,
    otpHash: await Hash({ plainText: String(otp), salt_rounds: SALT_ROUNDS })
  };
};

const ensureNotBlocked = async (user) => {
  if (user.loginBlockedUntil && user.loginBlockedUntil > new Date()) {
    throw new Error("account temporarily blocked, try again later", { cause: 429 });
  }

  if (user.loginBlockedUntil && user.loginBlockedUntil <= new Date()) {
    user.failedLoginAttempts = 0;
    user.loginBlockedUntil = null;
    await user.save();
  }
};

const handleFailedLogin = async (user) => {
  user.failedLoginAttempts += 1;

  if (user.failedLoginAttempts >= LOGIN_MAX_ATTEMPTS) {
    user.failedLoginAttempts = 0;
    user.loginBlockedUntil = new Date(Date.now() + LOGIN_BLOCK_MINUTES * 60 * 1000);
  }

  await user.save();
};

const resetLoginAttempts = async (user) => {
  if (user.failedLoginAttempts || user.loginBlockedUntil) {
    user.failedLoginAttempts = 0;
    user.loginBlockedUntil = null;
    await user.save();
  }
};

const createProfilePicture = async (file) => {
  if (!file) {
    return null;
  }

  const { secure_url, public_id } = await cloudinary.uploader.upload(file.path, {
    folder: "saraha_app",
    resource_type: "auto"
  });

  return { secure_url, public_id };
};

export const signUp = async (req, res, next) => {
  const { userName, email, password, cPassword, gender, phone } = req.body;

  if (password !== cPassword) {
    throw new Error("invalid password", { cause: 400 });
  }

  if (await db_service.findOne({ model: userModel, filter: { email } })) {
    throw new Error("email already exist", { cause: 409 });
  }

  const profilePicture = await createProfilePicture(req.file);
  const passwordHash = await Hash({ plainText: password, salt_rounds: SALT_ROUNDS });

  const user = await db_service.create({
    model: userModel,
    data: {
      userName,
      email,
      password: passwordHash,
      gender,
      phone: encrypt(phone),
      profilePicture
    }
  });

  const { otpHash } = await sendOtpMail({
    to: email,
    subject: "Hello From Saraha App",
    htmlPrefix: "Your email confirmation OTP is"
  });

  await setValue({
    key: `otp::confirm-email::${email}`,
    value: otpHash,
    ttl: OTP_TTL_SECONDS
  });

  successResponse({
    res,
    status: 201,
    message: "success signup, please confirm your email",
    data: { email: user.email }
  });
};

export const confirmEmail = async (req, res, next) => {
  const { code, email } = req.body;
  const otpValue = await get(`otp::confirm-email::${email}`);

  if (!otpValue) {
    throw new Error("otp expired", { cause: 400 });
  }

  const isMatch = await Compare({
    plainText: String(code),
    cipherText: otpValue
  });

  if (!isMatch) {
    throw new Error("invalid otp", { cause: 400 });
  }

  const user = await db_service.findOneAndUpdate({
    model: userModel,
    filter: {
      email,
      confirmed: false,
      provider: ProviderEnum.system
    },
    update: {
      confirmed: true,
      expiresAt: null
    }
  });

  if (!user) {
    throw new Error("user not exist or already confirmed", { cause: 404 });
  }

  await deleteKey(`otp::confirm-email::${email}`);

  successResponse({
    res,
    message: "email confirmed successfully"
  });
};

export const signUpWithGmail = async (req, res, next) => {
  const { idToken } = req.body;

  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();
  const { email, email_verified, name, picture } = payload;

  let user = await db_service.findOne({ model: userModel, filter: { email } });

  if (!user) {
    user = await db_service.create({
      model: userModel,
      data: {
        email,
        confirmed: email_verified,
        userName: name,
        profilePicture: picture
          ? { secure_url: picture, public_id: `google-${randomUUID()}` }
          : null,
        provider: ProviderEnum.google,
        expiresAt: null
      }
    });
  }

  if (user.provider === ProviderEnum.system) {
    throw new Error("Please login on System only", { cause: 400 });
  }

  const tokens = issueTokens(user);

  successResponse({
    res,
    message: "Success Sign in",
    data: tokens
  });
};

export const signIn = async (req, res, next) => {
  const { email, password } = req.body;

  const user = await db_service.findOne({
    model: userModel,
    filter: {
      email,
      provider: ProviderEnum.system
    }
  });

  if (!user) {
    throw new Error("User Not Exist", { cause: 404 });
  }

  if (!user.confirmed) {
    throw new Error("please confirm your email first", { cause: 400 });
  }

  await ensureNotBlocked(user);

  const isPasswordValid = await Compare({
    plainText: password,
    cipherText: user.password
  });

  if (!isPasswordValid) {
    await handleFailedLogin(user);
    throw new Error("Invalid Password", { cause: 409 });
  }

  await resetLoginAttempts(user);

  if (!user.twoFactorEnabled) {
    return successResponse({
      res,
      message: "success signin",
      data: issueTokens(user)
    });
  }

  const verificationToken = randomUUID();
  const { otpHash } = await sendOtpMail({
    to: user.email,
    subject: "Saraha App Login Verification",
    htmlPrefix: "Your login verification OTP is"
  });

  await setValue({
    key: `otp::login::${user.email}`,
    value: {
      otpHash,
      verificationToken
    },
    ttl: OTP_TTL_SECONDS
  });

  successResponse({
    res,
    message: "otp sent to email, confirm login to receive tokens",
    data: {
      verificationToken,
      requiresTwoFactor: true
    }
  });
};

export const confirmLogin = async (req, res, next) => {
  const { email, code, verificationToken } = req.body;

  const user = await db_service.findOne({
    model: userModel,
    filter: {
      email,
      provider: ProviderEnum.system
    }
  });

  if (!user) {
    throw new Error("User Not Exist", { cause: 404 });
  }

  const otpPayload = await get(`otp::login::${email}`);

  if (!otpPayload) {
    throw new Error("otp expired", { cause: 400 });
  }

  if (otpPayload.verificationToken !== verificationToken) {
    throw new Error("invalid verification token", { cause: 400 });
  }

  const isMatch = await Compare({
    plainText: String(code),
    cipherText: otpPayload.otpHash
  });

  if (!isMatch) {
    throw new Error("invalid otp", { cause: 400 });
  }

  await deleteKey(`otp::login::${email}`);

  successResponse({
    res,
    message: "success signin",
    data: issueTokens(user)
  });
};

export const enableTwoFactor = async (req, res, next) => {
  if (req.user.twoFactorEnabled) {
    throw new Error("two factor already enabled", { cause: 400 });
  }

  const { otpHash } = await sendOtpMail({
    to: req.user.email,
    subject: "Saraha App 2-Step Verification",
    htmlPrefix: "Your OTP to enable 2-step verification is"
  });

  await setValue({
    key: `otp::2fa-enable::${req.user.email}`,
    value: otpHash,
    ttl: OTP_TTL_SECONDS
  });

  successResponse({
    res,
    message: "otp sent to email to enable 2-step verification"
  });
};

export const verifyEnableTwoFactor = async (req, res, next) => {
  const { code } = req.body;
  const otpValue = await get(`otp::2fa-enable::${req.user.email}`);

  if (!otpValue) {
    throw new Error("otp expired", { cause: 400 });
  }

  const isMatch = await Compare({
    plainText: String(code),
    cipherText: otpValue
  });

  if (!isMatch) {
    throw new Error("invalid otp", { cause: 400 });
  }

  await db_service.findOneAndUpdate({
    model: userModel,
    filter: { _id: req.user._id },
    update: { twoFactorEnabled: true }
  });

  await deleteKey(`otp::2fa-enable::${req.user.email}`);

  successResponse({
    res,
    message: "2-step verification enabled successfully"
  });
};

export const getProfile = async (req, res, next) => {
  const key = `profile::${req.user._id}`;
  const userExist = await get(key);

  if (userExist) {
    return successResponse({ res, data: userExist });
  }

  const responseData = {
    ...req.user.toObject(),
    phone: req.user.phone ? decrypt(req.user.phone) : null
  };

  await setValue({ key, value: responseData, ttl: 60 * 5 });

  successResponse({ res, data: responseData });
};

export const refresh_token = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    throw new Error("token not found", { cause: 401 });
  }

  const [prefix, token] = authorization.split(" ");

  if (prefix?.toLowerCase() !== PREFIX) {
    throw new Error("inValid token prefix", { cause: 401 });
  }

  const decoded = VerifyToken({ token, secret_key: REFRESH_SECRET_KEY });

  if (!decoded || !decoded?.id) {
    throw new Error("inValid token", { cause: 401 });
  }

  const user = await db_service.findOne({
    model: userModel,
    filter: { _id: decoded.id }
  });

  if (!user) {
    throw new Error("user not exist", { cause: 400 });
  }

  const revokedToken = await get(
    revoked_key({ userId: user._id.toString(), jti: decoded.jti })
  );

  if (revokedToken) {
    throw new Error("invalid Token revoked", { cause: 401 });
  }

  const access_token = GenerateToken(
    {
      id: user._id,
      email: user.email
    },
    ACCESS_SECRET_KEY,
    {
      expiresIn: 60 * 5,
      jwtid: randomUUID()
    }
  );

  successResponse({ res, data: access_token });
};

export const shareProfile = async (req, res, next) => {
  const { id } = req.params;

  const user = await db_service.findOne({
    model: userModel,
    filter: { _id: id },
    select: "firstName lastName profilePicture coverPicture profileVisits"
  });

  if (!user) {
    throw new Error("User not found", { cause: 404 });
  }

  user.profileVisits += 1;
  await user.save();

  const response = {
    firstName: user.firstName,
    lastName: user.lastName,
    profilePicture: user.profilePicture,
    coverPicture: user.coverPicture
  };

  if (req.user?.role === RoleEnum.admin) {
    response.profileVisits = user.profileVisits;
  }

  return res.json({
    message: "Profile fetched",
    user: response
  });
};

export const updateProfile = async (req, res, next) => {
  let { firstName, lastName, gender, phone } = req.body;

  if (phone) {
    phone = encrypt(phone);
  }

  const user = await db_service.findOneAndUpdate({
    model: userModel,
    filter: { _id: req.user._id },
    update: { firstName, lastName, gender, phone }
  });

  if (!user) {
    throw new Error("user not exist yet", { cause: 404 });
  }

  await deleteKey(`profile::${req.user._id}`);

  successResponse({ res, data: user });
};

export const updatePassword = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  const isOldPasswordValid = await Compare({
    plainText: oldPassword,
    cipherText: req.user.password
  });

  if (!isOldPasswordValid) {
    throw new Error("inValid old Password", { cause: 400 });
  }

  req.user.password = await Hash({
    plainText: newPassword,
    salt_rounds: SALT_ROUNDS
  });
  req.user.changeCredential = new Date();
  await req.user.save();

  successResponse({ res, message: "password updated successfully" });
};

export const forgetPassword = async (req, res, next) => {
  const { email } = req.body;

  const user = await db_service.findOne({
    model: userModel,
    filter: { email, provider: ProviderEnum.system }
  });

  if (!user) {
    throw new Error("user not exist", { cause: 404 });
  }

  const { otpHash } = await sendOtpMail({
    to: user.email,
    subject: "Saraha App Reset Password",
    htmlPrefix: "Your reset password OTP is"
  });

  await setValue({
    key: `otp::reset-password::${email}`,
    value: otpHash,
    ttl: OTP_TTL_SECONDS
  });

  successResponse({
    res,
    message: "otp sent to email for password reset"
  });
};

export const resetPassword = async (req, res, next) => {
  const { email, code, password, cPassword } = req.body;

  if (password !== cPassword) {
    throw new Error("password mismatch", { cause: 400 });
  }

  const otpValue = await get(`otp::reset-password::${email}`);

  if (!otpValue) {
    throw new Error("otp expired", { cause: 400 });
  }

  const isMatch = await Compare({
    plainText: String(code),
    cipherText: otpValue
  });

  if (!isMatch) {
    throw new Error("invalid otp", { cause: 400 });
  }

  const user = await db_service.findOne({
    model: userModel,
    filter: { email, provider: ProviderEnum.system }
  });

  if (!user) {
    throw new Error("user not exist", { cause: 404 });
  }

  user.password = await Hash({
    plainText: password,
    salt_rounds: SALT_ROUNDS
  });
  user.changeCredential = new Date();
  user.failedLoginAttempts = 0;
  user.loginBlockedUntil = null;
  await user.save();

  await deleteKey(`otp::reset-password::${email}`);

  successResponse({
    res,
    message: "password reset successfully"
  });
};

export const logout = async (req, res, next) => {
  const { flag } = req.query;

  if (flag === "all") {
    req.user.changeCredential = new Date();
    await req.user.save();
    await deleteKey(await keys(get_key({ userId: req.user._id })));
  } else {
    await setValue({
      key: revoked_key({ userId: req.user._id.toString(), jti: req.decoded.jti }),
      value: `${req.decoded.jti}`,
      ttl: req.decoded.exp - Math.floor(Date.now() / 1000)
    });
  }

  successResponse({ res });
};

export const uploadCoverPicture = async (req, res, next) => {
  const user = req.user;
  const existing = user.coverPicture?.length || 0;
  const uploaded = req.files?.length || 0;

  if (existing + uploaded !== 2) {
    throw new Error("Total cover pictures must equal 2", { cause: 400 });
  }

  const cover = [];

  for (const file of req.files) {
    const { secure_url, public_id } = await cloudinary.uploader.upload(file.path, {
      folder: `saraha/users/${user._id}/cover`
    });

    cover.push({ secure_url, public_id });
  }

  user.coverPicture.push(...cover);
  await user.save();

  return res.json({ message: "Cover uploaded", cover: user.coverPicture });
};

export const uploadProfilePicture = async (req, res, next) => {
  const user = req.user;

  if (!req.file) {
    throw new Error("Image required", { cause: 400 });
  }

  const { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path, {
    folder: `saraha/users/${user._id}/profile`
  });

  if (user.profilePicture) {
    user.gallery.push(user.profilePicture);
  }

  user.profilePicture = {
    secure_url,
    public_id
  };

  await user.save();

  return res.json({
    message: "Profile picture updated",
    profile: user.profilePicture
  });
};

export const removeProfilePicture = async (req, res, next) => {
  const user = req.user;

  if (!user.profilePicture) {
    throw new Error("No profile image", { cause: 400 });
  }

  await cloudinary.uploader.destroy(user.profilePicture.public_id);

  user.profilePicture = null;
  await user.save();

  return res.json({
    message: "Profile picture removed"
  });
};
