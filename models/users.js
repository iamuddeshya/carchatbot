const mongoose = require("mongoose");
const debug = require("debug")("http");

const Schema = mongoose.Schema;

const users = new Schema({
  sFbData: Object,
  sAccount: String,
  sName: String,
  sSex: String,
  sEmail: String,
  sMobile: String,
  oIntrest: [Object],
  dCreatedDate: {
    type: Date,
    default: Date.now
  },
  dUpdatedDate: {
    type: Date,
    default: Date.now
  },
  oPlanType: {
    type: String,
    enum: ["individual", "family"]
  },
  bInsurance: Boolean
});

module.exports = mongoose.model("users", users);
