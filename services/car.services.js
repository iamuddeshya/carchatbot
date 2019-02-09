const fbService = require("./fb-service");
const yes_no = [{
    content_type: "text",
    title: "Yes",
    payload: "yes trade in"
},
{
    content_type: "text",
    title: "no",
    payload: "no trade in"
}]
const originalOp = [{
    content_type: "text",
    title: "Yes",
    payload: "original purchase yes"
  },
  {
    content_type: "text",
    title: "no",
    payload: "original purchase no"
  }]
const getBasic = (sender) => {
    var responseText = "What type of New Vehicle are you interested in? (Make/Model/Year) hain ?";
    fbService.sendTextMessage(sender, responseText)
}

const purcahseOrLease = (sender) => {
    fbService.sendQuickReply(sender, "Do you have a Trade-In service?", yes_no)
}

const tradeYes = (sender) => {
    var responseText = "Was this vehicle originally purchased from YoVIP?";
    fbService.sendQuickReply(sender, responseText, originalOp)
}

const contact = (sender) => {
    var card = [{
        "title": "Yovip car service",
        "subtitle": "For all your Vehicle needs: New, Used, Maintenance, Referrals welcomed.",
        "image_url": "https://scontent.fdel1-4.fna.fbcdn.net/v/t1.0-9/22728788_857629511065670_675564397629184718_n.jpg?_nc_cat=105&_nc_ht=scontent.fdel1-4.fna&oh=7e982ba2ef5ccb5c000207fc8128a30d&oe=5CFB23FF",
        "buttons": [{
          "type": "phone_number",
          "title": "Call 🤙",
          "payload": "+919057022806"
        }]
      }];

      fbService.sendGenericMessage(sender, card)
}
module.exports = {
    getBasic,
    purcahseOrLease,
    tradeYes,
    contact

}