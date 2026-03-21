import mongoose from "mongoose";
import { RoleEnum, GenderEnum, ProviderEnum } from "../../common/enum/user.enum.js";

const imageSchema = new mongoose.Schema(
  {
    secure_url: { type: String, required: true },
    public_id: { type: String, required: true }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      minLength: 3,
      maxLength: 20,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      minLength: 3,
      maxLength: 20,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: function () {
        return this.provider !== ProviderEnum.google;
      },
      trim: true
    },
    age: Number,
    phone: {
      type: String
    },
    gender: {
      type: String,
      enum: Object.values(GenderEnum),
      default: GenderEnum.male
    },
    profilePicture: {
      type: imageSchema,
      required: false
    },
    coverPicture: [imageSchema],
    gallery: [
      new mongoose.Schema(
        {
          secure_url: { type: String },
          public_id: { type: String }
        },
        { _id: false }
      )
    ],
    profileVisits: {
      type: Number,
      default: 0
    },
    changeCredential: {
      type: Date
    },
    confirmed: {
      type: Boolean,
      default: false
    },
    provider: {
      type: String,
      enum: Object.values(ProviderEnum),
      default: ProviderEnum.system
    },
    role: {
      type: String,
      enum: Object.values(RoleEnum),
      default: RoleEnum.user
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    loginBlockedUntil: {
      type: Date,
      default: null
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date,
      default: function () {
        return this.confirmed ? null : new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
    }
  },
  {
    timestamps: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

userSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: {
      expiresAt: { $type: "date" }
    }
  }
);

userSchema.virtual("userName")
  .get(function () {
    return `${this.firstName} ${this.lastName}`.trim();
  })
  .set(function (v) {
    const [firstName = "", ...rest] = String(v).trim().split(" ");
    this.set({
      firstName,
      lastName: rest.join(" ") || "User"
    });
  });

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
