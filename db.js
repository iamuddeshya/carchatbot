const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

let options = {
  poolSize: 2,
  promiseLibrary: global.Promise,
  useNewUrlParser: true
};
mongoose.set("debug", true);
mongoose.connect(
  "mongodb://cha:cha123@ds221435.mlab.com:21435/mongoose1161",
  options,
  function(err) {
    if (err) {
      console.log(err);

      console.log("Database not connected");
    } else {
      console.log("Success! DB connected Succesfully.");
    }
  }
);

