const express = require('express');
const fs = require('fs');
require('dotenv').config();
const {db} = require("../utils/firebase")
require('../calender');
const {router} = require("../routes/auth")

const app = express();
app.use(router)

const PORT = process.env.PORT||3000 ;
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});

module.exports = app;