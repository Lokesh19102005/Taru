require("dotenv").config();
const http = require("http");
const connectDB = require("./config/db");
const app = require("./app");
const { initRealtime } = require("./realtime"); // will load src/realtime/index.js via Node resolution

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  const server = http.createServer(app);

  // attach realtime (returns io instance)
  initRealtime(server);

  server.listen(PORT, () => {
    console.log(
      `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`,
    );
  });
});

process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  process.exit(1);
});
