const axios = require("axios");
const fs = require("fs");
const path = require("path");

// === CONFIG ===
const refreshToken = "1000.fab2a60f30fa202214e9ee3e0e0fbcee.e441df6ade3dd923396a4982fca409f5";
const clientId = "1000.B5VK6S9XGVRMU8ZBYO9BST0VPZVPKH";
const clientSecret = "064d3e76af2ade17f1c31483e0b540e2631da914d5";
const redirectUri = "http://www.zoho.com/books";
const organizationId = "873366270";
const uffizioAPI = "https://zoho.uffizio.com:8445/billingservice/admin/vehicle_details";
const hardcodedStartDate = "2025-04-01 00:00:00";
const hardcodedEndDate = "2025-04-30 23:59:59";
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const logFilePath = path.join(__dirname, `../output/logs/salesorder_log_${timestamp}.log`);

// === LOGGING FUNCTION ===
function log(msg) {
  console.log(msg);
  fs.appendFileSync(logFilePath, msg + "\n");
}

// === REFRESH ACCESS TOKEN ===
async function getAccessToken() {
  try {
    const res = await axios.post("https://accounts.zoho.com/oauth/v2/token", null, {
      params: {
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "refresh_token"
      }
    });

    const token = res.data.access_token;
    fs.writeFileSync(
      "../output/latest_access_token.json",
      JSON.stringify({ access_token: token, generated_on: new Date().toISOString() }, null, 2)
    );
    log("🔑 Access token refreshed.");
    return token;
  } catch (err) {
    log("❌ Failed to refresh token: " + JSON.stringify(err.response?.data || err.message));
    process.exit(1);
  }
}

// === MAIN ===
(async () => {
  const accessToken = await getAccessToken();

  log("📂 Reading input files...");
  const contactMap = JSON.parse(fs.readFileSync("../data/contact_map.json", "utf-8"));
  const itemMap = JSON.parse(fs.readFileSync("../data/item_map.json", "utf-8"));
  const pricingMap = JSON.parse(fs.readFileSync("../data/customer_map.json", "utf-8"));
  const customerData = JSON.parse(fs.readFileSync("../data/customer_project_ip_data_all.json", "utf-8"));

  for (let customer of customerData) {
    const { "Customer Code": customerCode, Projects = [] } = customer;
    const contactId = contactMap?.[customerCode]?.contact_id;

    log(`\n=============================`);
    log(`🧾 Processing Customer: ${customerCode}`);
    log(`=============================`);

    if (!contactId) {
      log(`❌ Missing contact ID for customer: ${customerCode}`);
      continue;
    }

    const lineItems = [];

    for (let project of Projects) {
      const projectId = project["Project Id"]?.toString();
      const itemName = project["Project/Product Name"];
      const ips = project["IP Addresses"] || [];

      log(`\n🔧 Project: ${itemName} (ID: ${projectId})`);
      const itemId = itemMap?.[projectId]?.item_id;

      if (!itemId) {
        log(`⚠️ Missing item ID for project ${projectId} (${itemName})`);
        continue;
      }

      for (let ip of ips) {
        const rateObj = pricingMap?.[customerCode]?.projects;
        let rates = Object.values(rateObj).filter(v => v.project_id === projectId)?.[0];
        let rate = rates?.pricing?.[ip]?.rate;

        if (!rate){
          log(`⚠️ Missing rate for ${customerCode} / ${projectId} / IP: ${ip}`);
          continue;
        }

        try {
          log(`📡 Fetching vehicle count for Project ${projectId}, IP ${ip}...`);
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
          const quantity = records.filter(v => v.ip === ip).length;

          log(`📊 ${records.length} total records, ${quantity} match IP ${ip}`);

          if (quantity === 0) {
            log(`ℹ️ Skipping – No vehicles match IP: ${ip}`);
            continue;
          }

          const item = {
            item_id: itemId,
            rate: rate,
            quantity,
            unit: "Nos"
          };

          log(`📦 Line Item Added: ${JSON.stringify(item)}`);
          lineItems.push(item);

        } catch (err) {
          log(`❌ Error fetching Uffizio data: ${JSON.stringify(err.response?.data || err.message)}`);
        }
      }
    }

    if (lineItems.length > 0) {
      try {
        const salesOrder = {
          customer_id: contactId,
          line_items: lineItems
        };

        log(`📝 Creating Zoho Sales Order with ${lineItems.length} line items...`);
        const zohoRes = await axios.post(
          `https://www.zohoapis.com/books/v3/salesorders?organization_id=${organizationId}`,
          salesOrder,
          {
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
              "Content-Type": "application/json"
            }
          }
        );

        const orderId = zohoRes.data?.salesorder?.salesorder_id;
        log(`✅ Sales order created: ${orderId} for ${customerCode}`);
        // Optional: log full response
        // log(`📄 Zoho Response: ${JSON.stringify(zohoRes.data, null, 2)}`);

      } catch (err) {
        log(`❌ Failed to create sales order: ${JSON.stringify(err.response?.data || err.message)}`);
      }
    } else {
      log(`⚠️ No valid line items for ${customerCode}, skipping order creation.`);
    }
  }

  log("🎉 All customers processed.");
})();
