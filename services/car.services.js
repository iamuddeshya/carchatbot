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
    var responseText = "What type of New Vehicle are you interested in? (Make/Model/Year)";
    fbService.sendTextMessage(sender, responseText)
}

const purcahseOrLease = (sender) => {
    fbService.sendQuickReply(sender, "Do you have a Trade-In ?", yes_no)
}

const tradeYes = (sender) => {
    var responseText = "Was this vehicle originally purchased from Christian?";
    fbService.sendQuickReply(sender, responseText, originalOp)
}

const contact = (sender) => {
    var card = [{
        "title": "Christian Febel Fleet and Leasing Manager",
        "subtitle": "For all your Vehicle needs: New, Used, Maintenance, Referrals welcomed.",
        "image_url": "https://scontent-bom1-2.xx.fbcdn.net/v/t1.0-9/49739154_1193037890851964_6840531856140533760_n.jpg?_nc_cat=107&_nc_ht=scontent-bom1-2.xx&oh=e5fa8aba97a2b8bfc03bb9ad99cfbcae&oe=5CB3CF91",
        "buttons": [{
          "type": "phone_number",
          "title": "Call 🤙",
          "payload": "+19057022806"
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