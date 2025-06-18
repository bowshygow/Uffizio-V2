// Dependencies
const axios = require("axios");
const XLSX = require("xlsx");
const fs = require("fs");

// Input (hardcoded for now)
const adminCode = "CUS-UT186";
const projectId = "37";
const ipToFilter = "13.126.244.90";

// Updated API now accepts POST instead of GET
const url = "https://zoho.uffizio.com:8445/billingservice/admin/vehicle_details?pageNo=1&pageSize=100000";

const body = {
  adminCode,
  projectId,
  startDate: "2025-04-01 00:00:00",
  endDate: "2025-04-30 00:00:00"
};

(async () => {
  try {
    const response = await axios({
      method: "post",
      url: url,
      headers: {
        "Content-Type": "application/json"
      },
      data: body
    });

    const vehicles = response.data.data || [];
    console.log(vehicles);
    const matchingVehicles = vehicles.filter(vehicle => vehicle.ip === ipToFilter);

    console.log(`Total Records Received: ${vehicles.length}`);
    console.log(`Records matching IP ${ipToFilter}: ${matchingVehicles.length}`);

    // Write full response to Excel
    const sheet = XLSX.utils.json_to_sheet(vehicles);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Vehicle Data");
    XLSX.writeFile(workbook, "../output/full_vehicle_data.xlsx");

    console.log("✅ Excel file saved: full_vehicle_data.xlsx");
  } catch (error) {
    console.error("Error while calling API:", error.message);
    if (error.response) {
      console.error("Response:", error.response.data);
    }
  }
})();
