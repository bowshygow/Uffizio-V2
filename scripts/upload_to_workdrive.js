/**
 * Script: upload_to_workdrive.js
 * Purpose:
 *   - Refresh Zoho OAuth token using refresh_token
 *   - Upload a file (e.g., log or CSV) to a specified folder in WorkDrive
 * Inputs:
 *   - File path (local)
 *   - Destination WorkDrive folder ID
 * Output:
 *   - Success/failure response from Zoho WorkDrive
 */

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

// === CONFIG ===
const clientId = "1000.QBUMIOKNBLEQGKTTTVRYRS5R9H6FGI";
const clientSecret = "c8ace4a1ae8eaf37f7ebcc1568469352648bd41c1d";
const refreshToken = "1000.472330086860741306a0140a0ea58d22.d07cb4f428abd84ef80869482ace6578";
const parentId = "34zogebfc5e50614b4dffa76f97a5b0bd2776"; // Replace with your actual WorkDrive folder ID

// === REFRESH ACCESS TOKEN ===
async function getAccessToken() {
  const url = "https://accounts.zoho.in/oauth/v2/token";
  const params = {
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token"
  };

  try {
    const res = await axios.post(url, null, { params });
    return res.data.access_token;
  } catch (err) {
    console.error("❌ Error refreshing token:", err.response?.data || err.message);
    return null;
  }
}

// === UPLOAD TO WORKDRIVE ===
async function uploadToWorkDrive(filePath) {
  const accessToken = await getAccessToken();
  if (!accessToken) return;

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

    console.log(`✅ File uploaded successfully: ${response.data.data[0].name}`);
  } catch (err) {
    console.error("❌ File upload failed:", err.response?.data || err.message);
  }
}

// === Run Upload If Script Called Directly ===
if (require.main === module) {
  const fileToUpload = process.argv[2];
  if (!fileToUpload) {
    console.error("❌ Please provide a file path: node upload_to_workdrive.js <file-path>");
    process.exit(1);
  }
  uploadToWorkDrive(fileToUpload);
}
