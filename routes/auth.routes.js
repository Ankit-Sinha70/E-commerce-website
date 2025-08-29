import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.model.js";

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_SECRET);

//GET oauth routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.redirect(`${process.env.CLIENT_URL}/auth-success?token=${token}`);
  }
);

// New POST route for GSI / One‑Tap
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential)
      return res
        .status(400)
        .json({ success: false, message: "Missing credential" });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    let user = await User.findOne({ email: payload.email });
    if (!user) {
      user = await User.create({
        name: payload.name,
        email: payload.email,
        googleId: payload.sub,
        avatar: payload.picture,
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.json({ success: true, token, user });
  } catch (err) {
    console.error("Google token verify error:", err);
    return res.status(500).json({
      success: false,
      message: "Google login failed",
      error: err.message,
    });
  }
});

// existing Facebook routes...
router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);
router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { session: false }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.redirect(`${process.env.CLIENT_URL}/auth-success?token=${token}`);
  }
);

export default router;
