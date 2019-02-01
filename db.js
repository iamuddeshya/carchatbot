const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

let options = {
  poolSize: 2,
  promiseLibrary: global.Promise,
  useNewUrlParser: true
};
mongoose.set("debug", true);
mongoose.connect(
  "mongodb://cha:cha123@ds147274.mlab.com:47274/book",
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

