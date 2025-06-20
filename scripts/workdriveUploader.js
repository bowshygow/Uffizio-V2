// workdriveUploader.js

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

// === CONFIG ===
const clientId = "1000.QBUMIOKNBLEQGKTTTVRYRS5R9H6FGI";
const clientSecret = "c8ace4a1ae8eaf37f7ebcc1568469352648bd41c1d";
const refreshToken = "1000.472330086860741306a0140a0ea58d22.d07cb4f428abd84ef80869482ace6578";
const parentId = "34zogebfc5e50614b4dffa76f97a5b0bd2776"; // Replace with your actual folder ID

// === Get Access Token ===
async function getAccessToken() {
  try {
    const res = await axios.post("https://accounts.zoho.in/oauth/v2/token", null, {
      params: {
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token"
      }
    });
    return res.data.access_token;
  } catch (err) {
    console.error("❌ Error refreshing token:", err.response?.data || err.message);
    return null;
  }
}

// === Upload File to WorkDrive ===
async function uploadFileToWorkDrive(filePath) {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  const form = new FormData();
  form.append("filename", path.basename(filePath));
  form.append("parent_id", parentId);
  form.append("override-name-exist", "true");
  form.append("content", fs.createReadStream(filePath));

  try {
    const response = await axios.post("https://workdrive.zoho.in/api/v1/upload", form, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        ...form.getHeaders()
      }
    });
    console.log(`✅ File uploaded to WorkDrive: ${response.data.data[0].name}`);
    return true;
  } catch (err) {
    console.error("❌ Upload failed:", err.response?.data || err.message);
    return false;
  }
}

module.exports = { uploadFileToWorkDrive };
