// **IMPORTS**
var express = require("express");
var app = express();
var redis = require("redis");

// **REDIS CLIENT SETUP**
var client = redis.createClient({
  host: 'localhost',
  port: 6379,
});

client.on("error", function (error) {
  console.error("Redis Error: ", error);
});

// **INITIALIZATION**
// Check if keys exist in Redis, and if not, initialize them
client.mget(["header", "left", "right", "article", "footer"], function(err, values) {
  if(!values.some(value => value !== null)) {
    client.mset({
      "header": 0,
      "left": 0,
      "article": 0,
      "right": 0,
      "footer": 0,
    }, (err) => {
      if (err) console.error("Redis mset error:", err);
    });
  }
});

// **MIDDLEWARE**
// Serve static files from public directory
app.use(express.static("public"));

// **UTILITY FUNCTIONS**
// Get values for the holy grail layout sections
function data() {
  return new Promise((resolve, reject) => {
    client.mget("header", "left", "right", "article", "footer", (err, values) => {
      if (err) return reject(err);
      const data = {
        header: parseInt(values[0], 10),
        left: parseInt(values[1], 10),
        right: parseInt(values[2], 10),
        article: parseInt(values[3], 10),
        footer: parseInt(values[4], 10),
      };
      resolve(data);
    });
  });
}

// **API ENDPOINTS**
// Update a specific section value
app.get("/update/:key/:value", function(req, res) {
  const key = req.params.key;
  let value = parseInt(req.params.value, 10);

  client.incrby(key, value, (err) => {
    if (err) {
      res.status(500).send({ error: "Failed to update in Redis" });
      return;
    }
    data().then(updatedData => {
      res.send(updatedData);
    }).catch(error => {
      res.status(500).send({ error: "Failed to retrieve updated data from Redis" });
    });
  });
});

// Get the current values for all sections
app.get("/data", function(req, res) {
  data().then((dataValues) => {
    res.send(dataValues);
  }).catch(error => {
    res.status(500).send({ error: "Failed to retrieve data from Redis" });
  });
});

// **SERVER SETUP**
app.listen(3000, () => {
  console.log("Running on 3000");
});

// **CLEANUP**
// Ensure Redis client quits when the server process stops
process.on("exit", function() {
  client.quit();
});
