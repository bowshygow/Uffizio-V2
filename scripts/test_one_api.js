const axios = require("axios");

// Get arguments from the terminal
const [, , adminCode, projectId, ipToFilter] = process.argv;

// Check if all values are provided
if (!adminCode || !projectId || !ipToFilter) {
  console.error("❌ Usage: node script.js <adminCode> <projectId> <ipToFilter>");
  process.exit(1);
}

// API setup
const url = "https://zoho.uffizio.com:8445/billingservice/admin/vehicle_details?pageNo=1&pageSize=100000";

const body = {
  adminCode,
  projectId,
  startDate: "2025-04-01 00:00:00",
  endDate: "2025-04-30 23:59:59"
};

(async () => {
  try {
    const res = await axios.post(url, body, {
      headers: { "Content-Type": "application/json" }
    });
    console.log(res.data);

    const records = res.data?.data || [];
    const filtered = records.filter(v => v.ip === ipToFilter);

    console.log(`✅ Total records: ${records.length}`);
    console.log(`📌 Records matching IP ${ipToFilter}: ${filtered.length}`);
  } catch (err) {
    console.error("❌ API call failed:", err.response?.data || err.message);
  }
})();
