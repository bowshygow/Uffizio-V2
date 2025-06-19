/**
 * Script: vehicle_count_export.js
 * Purpose:
 *   - For each customer/project/IP in `customer_project_ip_data_all.json`
 *   - Call Uffizio API to get vehicle count between a fixed date range
 *   - Output results in a CSV: Customer Code, Project ID, IP, Match Count, Total Count, Timestamp
 *
 * Inputs:
 *   - ../data/customer_project_ip_data_all.json
 *
 * Outputs:
 *   - ../output/vehicle_count_results.csv
 *   - ../output/vehicle_count_log_<timestamp>.log (detailed log)
 *
 * Notes:
 *   - This script is for testing and verification purposes only.
 *   - No Zoho API calls or token refresh involved.
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");

const uffizioAPI = "https://zoho.uffizio.com:8445/billingservice/admin/vehicle_details";
const hardcodedStartDate = "2025-04-01 00:00:00";
const hardcodedEndDate = "2025-04-30 23:59:59";

// Create timestamped log file
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const logFilePath = path.join(__dirname, `../output/vehicle_count_log_${timestamp}.log`);
const csvFilePath = path.join(__dirname, "../output/vehicle_count_results.csv");

function log(msg) {
  const timeStampedMsg = `[${new Date().toISOString()}] ${msg}`;
  console.log(timeStampedMsg);
  fs.appendFileSync(logFilePath, timeStampedMsg + "\n");
}

// Load input file
log("📂 Reading customer/project/IP input file...");
const customerData = JSON.parse(fs.readFileSync("../data/customer_project_ip_data_all.json", "utf-8"));

// Prepare CSV output
let csvOutput = "Timestamp,Customer Code,Project ID,Project Name,IP Address,Vehicle Count (Matching IP),Total Vehicle Records\n";

(async () => {
  for (let customer of customerData) {
    const { "Customer Code": customerCode, Projects = [] } = customer;
    log(`\n🔍 Processing Customer: ${customerCode}`);

    for (let project of Projects) {
      const projectId = project["Project Id"]?.toString();
      const itemName = project["Project/Product Name"];
      const ips = project["IP Addresses"] || [];

      log(`📁 Project: ${itemName} (ID: ${projectId}) with ${ips.length} IP(s)`);

      for (let ip of ips) {
        const runTime = new Date().toISOString();
        log(`📡 Calling Uffizio API → ${customerCode} / ${projectId} / IP: ${ip}`);
        try {
          const response = await axios.post(
            `${uffizioAPI}?pageNo=1&pageSize=100000`,
            {
              adminCode: customerCode,
              projectId,
              startDate: hardcodedStartDate,
              endDate: hardcodedEndDate
            },
            { headers: { "Content-Type": "application/json" } }
          );

          const records = response.data?.data || [];
          const totalCount = records.length;
          const matchCount = records.filter(r => r.ip === ip).length;

          csvOutput += `${runTime},${customerCode},${projectId},${itemName},${ip},${matchCount},${totalCount}\n`;
          log(`✅ ${customerCode} / ${projectId} / ${ip} → ${matchCount} matched out of ${totalCount} total`);

          // Wait for 2 seconds before next request
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
          const errorMsg = `❌ Error for ${customerCode} / ${projectId} / IP: ${ip} → ${err.response?.data || err.message}`;
          log(errorMsg);
        }
      }
    }
  }

  fs.writeFileSync(csvFilePath, csvOutput);
  log(`\n📄 CSV saved to: ${csvFilePath}`);
  log(`📘 Full log saved to: ${logFilePath}`);
})();
