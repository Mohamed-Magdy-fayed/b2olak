const fs = require("fs");

const appJson = require("./app.json");

let googleServicesFile = appJson.expo.android.googleServicesFile;

if (process.env.GOOGLE_SERVICES_JSON) {
  const val = process.env.GOOGLE_SERVICES_JSON;
  if (fs.existsSync(val)) {
    // EAS file secret: env var is the path to the uploaded file
    googleServicesFile = val;
  } else {
    // EAS string secret: env var is base64-encoded file content
    fs.writeFileSync(
      "./google-services.json",
      Buffer.from(val, "base64").toString("utf8"),
    );
    googleServicesFile = "./google-services.json";
  }
}

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      googleServicesFile,
    },
  },
};
