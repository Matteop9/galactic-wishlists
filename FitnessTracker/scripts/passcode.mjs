// Prints a bcrypt hash for PASSCODE_HASH. Usage: npm run passcode -- "your passcode"
import bcrypt from "bcryptjs";

const passcode = process.argv[2];
if (!passcode) {
  console.error('Usage: npm run passcode -- "your passcode"');
  process.exit(1);
}
// b64-wrapped so the $ signs in the bcrypt hash survive .env expansion and shell quoting.
console.log("b64:" + Buffer.from(bcrypt.hashSync(passcode, 10), "utf8").toString("base64"));
