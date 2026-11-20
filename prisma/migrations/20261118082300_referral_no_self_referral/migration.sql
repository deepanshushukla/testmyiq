-- docs/DATABASE.md: self-referral blocked at the DB level, not just in application code.
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_no_self_referral" CHECK ("referrerUserId" <> "referredUserId");
