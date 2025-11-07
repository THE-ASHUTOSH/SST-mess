import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import dotenv from "dotenv";

dotenv.config({quiet: true});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/auth/google/callback`,
      passReqToCallback: true,
    },
    async (req,accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || "";
        const domain = email.split("@")[1];

        // ✅ Allowed domains
        const allowedDomains = ["sst.scaler.com", "scaler.com"];

        if (!allowedDomains.includes(domain)) {
          return done(null, { status: "unauthorized" }, {
            message: "Access denied: unauthorized domain",
          });
        }
      } catch (error) {
        return done(error);
      }

      // No DB — just pass the profile forward
      const user = {
        id: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0]?.value,
        picture: profile.photos?.[0]?.value,
        provider: "google",
      };
      // console.log("Google profile:", profile);
      done(null, user);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));