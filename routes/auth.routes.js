import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.model.js";
import https from "https";

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

// existing Facebook GET routes...
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

// New POST route for Facebook direct access token login
router.post("/facebook", async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ success: false, message: "Missing Facebook access token" });
    }

    // Verify Facebook token by calling Facebook Graph API
    const fbApiUrl = `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`;

    const fbData = await new Promise((resolve, reject) => {
      https.get(fbApiUrl, (apiRes) => {
        let data = '';
        apiRes.on('data', (chunk) => data += chunk);
        apiRes.on('end', () => resolve(JSON.parse(data)));
        apiRes.on('error', (err) => reject(err));
      }).on('error', (err) => reject(err));
    });

    if (fbData.error) {
      console.error("Facebook Graph API error:", fbData.error);
      return res.status(400).json({ success: false, message: fbData.error.message || "Facebook token verification failed" });
    }

    const { id: facebookId, name, email, picture } = fbData;

    if (!email) {
      return res.status(400).json({ success: false, message: "Facebook did not provide an email. Please ensure your Facebook app requests 'email' permission." });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        facebookId,
        avatar: picture?.data?.url,
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.json({ success: true, token, user });

  } catch (err) {
    console.error("Facebook login error:", err);
    return res.status(500).json({
      success: false,
      message: "Facebook login failed",
      error: err.message,
    });
  }
});

export default router;