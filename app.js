"use strict";

const dialogflow = require("dialogflow");
const config = require("./constant");
const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const app = express();
const uuid = require("uuid");
const dialogflowService = require("./services/dialogflow-service");
const fbService = require("./services/fb-service");
const db = require("./db");
const UserModel = require("./models/users");
const hp = require("./services/handover-protocol");
const _sendQuickReply = require("./services/quick-reply");
const _ = require('./services/car.services')
const yes_no = [{
  content_type: "text",
  title: "Yes",
  payload: "yes trade in"
},
{
  content_type: "text",
  title: "no",
  payload: "no trade in"
}
]
const contactType = [{
  content_type: "text",
  title: "Phone",
  payload: "Phone"

}, {
  content_type: "text",
  title: "email",
  payload: "email"
},
{
  content_type: "text",
  title: "SMS",
  payload: "SMS"
}
]
const carOptions = [{
  content_type: "text",
  title: "Purchase 🚗",
  payload: "purchase"
},
{
  content_type: "text",
  title: "lease",
  payload: "lease"
}]

app.set("port", process.env.PORT || 5000);
app.set('view engine', 'ejs');

//verify request came from facebook

//serve static files in the public directory
app.use(express.static(__dirname + "/public"));
app.use("/public", express.static(__dirname + "/public"));

// Process application/x-www-form-urlencoded
app.use(
  bodyParser.urlencoded({
    extended: false
  })
);

// Process application/json
app.use(bodyParser.json());

const credentials = {
  client_email: config.GOOGLE_CLIENT_EMAIL,
  private_key: config.GOOGLE_PRIVATE_KEY
};

const sessionClient = new dialogflow.SessionsClient({
  projectId: config.GOOGLE_PROJECT_ID,
  credentials
});

const sessionIds = new Map();
const usersMap = new Map();

// Index route
app.get("/", function (req, res) {
  res.send("Hello world, I am a chat bot alive");
});



// for Facebook verification
app.get("/webhook/", function (req, res) {
  console.log("request");
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === config.FB_VERIFY_TOKEN
  ) {
    res.status(200).send(req.query["hub.challenge"]);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});

/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page.
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post("/webhook/", function (req, res) {
  var data = req.body;
  // Make sure this is a page subscription
  if (data.object == "page") {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function (pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;
      // Iterate over each messaging event

      if (pageEntry.standby) {
        // iterate webhook events from standby channel
        pageEntry.standby.forEach(event => {
          const psid = event.sender.id;
          const message = event.message;

          if (
            message &&
            message.quick_reply &&
            message.quick_reply.payload == "take_from_inbox"
          ) {
            var responseText = "Bot is back in control";
            fbService.sendTextMessage(psid, responseText);
            // sendQuickReply(psid, text, title, payload);
            hp.takeThreadControl(psid);
          }
        });
      } else if (pageEntry.messaging) {
        pageEntry.messaging.forEach(function (messagingEvent) {
          if (messagingEvent.optin) {
            fbService.receivedAuthentication(messagingEvent);
          } else if (messagingEvent.message) {
            receivedMessage(messagingEvent);
          } else if (messagingEvent.delivery) {
            fbService.receivedDeliveryConfirmation(messagingEvent);
          } else if (messagingEvent.postback) {
            receivedPostback(messagingEvent);
          } else if (messagingEvent.read) {
            fbService.receivedMessageRead(messagingEvent);
          } else if (messagingEvent.account_linking) {
            fbService.receivedAccountLink(messagingEvent);
          } else {
            console.log(
              "Webhook received unknown messagingEvent: ",
              messagingEvent
            );
          }
        });
      }
    });

    // Assume all went well.
    // You must send back a 200, within 20 seconds
    res.sendStatus(200);
  }
});

function setSessionAndUser(senderID) {
  if (!sessionIds.has(senderID)) {
    sessionIds.set(senderID, uuid.v1());
  }
}
async function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  await setSessionAndUser(senderID);

  //console.log("Received message for user %d and page %d at %d with message:", senderID, recipientID, timeOfMessage);
  //console.log(JSON.stringify(message));

  var isEcho = message.is_echo;
  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;
  const psid = event.sender.id;

  if (quickReply && quickReply.payload == "pass_to_inbox") {
    // quick reply to pass to Page inbox was clicked
    var page_inbox_app_id = 263902037430900;
    var text = "Bot is transfering Control to Our Admin";
    var title = "Resume bot";
    var payload = "take_from_inbox";

    await _sendQuickReply(psid, text, title, payload);
    await hp.passThreadControl(psid, page_inbox_app_id);
    return false;
  } else if (event.pass_thread_control) {
    // thread control was passed back to bot manually in Page inbox
    var responseText = "Query Solved.";
    await _sendQuickReply(psid, responseText);
  }
  if (isEcho) {
    fbService.handleEcho(messageId, appId, metadata);
    return;
  } else if (quickReply) {
    handleQuickReply(senderID, quickReply, messageId);
    return;
  }

  if (messageText) {
    //send message to DialogFlow
    dialogflowService.sendTextQueryToDialogFlow(
      sessionIds,
      handleDialogFlowResponse,
      senderID,
      messageText
    );
  } else if (messageAttachments) {

    fbService.handleMessageAttachments(messageAttachments, senderID);
  }
}

function handleQuickReply(senderID, quickReply, messageId) {

  var quickReplyPayload = quickReply.payload;
  console.log(quickReplyPayload);

  switch (quickReplyPayload) {

    // case "yes trade in":
    //   dialogflowService.sendEventToDialogFlow(sessionIds, handleDialogFlowResponse, senderID, "trade-in-yes")
    //   break;

    // case "no trade in":
    //   dialogflowService.sendEventToDialogFlow(sessionIds, handleDialogFlowResponse, senderID, "trade-in-no")
    //   break;
    default:
      dialogflowService.sendTextQueryToDialogFlow(
        sessionIds,
        handleDialogFlowResponse,
        senderID,
        quickReplyPayload
      );
      break;
  }
}



async function handleDialogFlowAction(
  sender,
  action,
  messages,
  contexts,
  parameters
) {
  console.log("--------------", action, "-------------------");
  // console.log("----------------------------------------------------------");
  // console.log(parameters.fields);
  // console.log("----------------------------------------------------------");
  // console.log(JSON.stringify(contexts, null, 2));
  // console.log("----------------------------------------------------------");
  switch (action) {

    case "get-basics":
    case "get-basics-used-car":
      _.getBasic(sender)
      break;

    case "user-select-car":
      var { cars, carmodel, year, insurance } = parameters.fields;

      if (fbService.isDefined(contexts[0].parameters.fields['used-car']) && !insurance.stringValue) {
        fbService.sendTextMessage(sender, "Would you like a Financing Quote on this Vehicle ehh?")
      } else if (insurance.stringValue && fbService.isDefined(contexts[0].parameters.fields['used-car'])) {
        fbService.sendQuickReply(sender, "Do you have a Trade-In ?", yes_no)
      }
      else if ((cars.stringValue || year.original.stringValue || carmodel.stringValue) && !insurance.stringValue) {
        let bool = config.cars.some(x => x.toLowerCase() == cars.stringValue.toLowerCase())
        bool ? fbService.sendQuickReply(sender, `Great.  Would you like to Lease or Purchase ${cars.stringValue}?`, carOptions) : fbService.sendTextMessage(sender, `${cars.stringValue} is not seemes to be car make. :(`)
      }
      fbService.handleMessages(messages, sender);

      break;

    case "user-purchase":
    case "user-lease":
      _.purcahseOrLease(sender)
      break;

    case "trade-in-yes":
      _.tradeYes(sender)
      break;

    case "trade-in-no":
      fbService.sendQuickReply(sender, "how would you like to get connacted?", contactType)
      dialogflowService.sendEventToDialogFlow(sessionIds, handleDialogFlowResponse, sender, "getconnect")
      break;

    case "original-purchase-yes":
      if (parameters.fields.km.numberValue) {
        fbService.sendQuickReply(sender, "how would you like to get connacted?", contactType)
        dialogflowService.sendEventToDialogFlow(sessionIds, handleDialogFlowResponse, sender, "getconnect")
      }
      fbService.handleMessages(messages, sender);
      break;

    case "original-purchase-no":
      console.log(parameters.fields);
      var { majorbrake, cars, insurance, km } = parameters.fields;
      if (majorbrake.stringValue && cars.stringValue && insurance.stringValue && km.numberValue) {
        fbService.sendQuickReply(sender, "how would you like to get connacted?", contactType)
        dialogflowService.sendEventToDialogFlow(sessionIds, handleDialogFlowResponse, sender, "getconnect")
      }
      fbService.handleMessages(messages, sender);
      break;

    case "contact":
      _.contact(sender)
      break;

    case "service":
      var { date, time, email, AppointmentType } = parameters.fields
      if (date && time && email && AppointmentType) {
        var data = { date, time, email, AppointmentType }
      }
      fbService.handleMessages(messages, sender);
      break;

    case "getconnect":
      var { mail, mobile } = parameters.fields;
      if (parameters.fields['connect-type'].stringValue == 'email') {
        fbService.sendTextMessage(sender, `what is your email?`)
      }
      if (parameters.fields['connect-type'].stringValue == 'sms' || parameters.fields['connect-type'].stringValue == 'phone') {
        fbService.sendTextMessage(sender, `what is your mobile number?`)
      }
      console.log(parameters.fields);

      if (mail.stringValue || mobile.stringValue) {
        fbService.sendTextMessage(sender, `Thanks for reaching out.  yovip will be intouch shortly.`)
      }
      fbService.handleMessages(messages, sender);
      break;

    default:
      fbService.handleMessages(messages, sender);
  }
}

function handleMessages(messages, sender) {
  var timeoutInterval = 1100;
  var previousType;
  var cardTypes = [];
  var timeout = 0;
  for (var i = 0; i < messages.length; i++) {
    if (
      previousType == "card" &&
      (messages[i].message != "card" || i == messages.length - 1)
    ) {
      timeout = (i - 1) * timeoutInterval;
      setTimeout(handleCardMessages.bind(null, cardTypes, sender), timeout);
      cardTypes = [];
      timeout = i * timeoutInterval;
      setTimeout(handleMessage.bind(null, messages[i], sender), timeout);
    } else if (messages[i].message == "card" && i == messages.length - 1) {
      cardTypes.push(messages[i]);
      timeout = (i - 1) * timeoutInterval;
      setTimeout(handleCardMessages.bind(null, cardTypes, sender), timeout);
      cardTypes = [];
    } else if (messages[i].message == "card") {
      cardTypes.push(messages[i]);
    } else {
      timeout = i * timeoutInterval;
      setTimeout(handleMessage.bind(null, messages[i], sender), timeout);
    }

    previousType = messages[i].message;
  }
}

function handleDialogFlowResponse(sender, response) {
  var responseText = response.fulfillmentMessages.fulfillmentText;

  var messages = response.fulfillmentMessages;
  var action = response.action;
  var contexts = response.outputContexts;
  var parameters = response.parameters;

  fbService.sendTypingOff(sender);

  if (fbService.isDefined(action)) {
    handleDialogFlowAction(sender, action, messages, contexts, parameters);
  } else if (fbService.isDefined(messages)) {
    fbService.handleMessages(messages, sender);
  } else if (responseText == "" && !fbService.isDefined(action)) {
    //dialogflow could not evaluate input.
    fbService.sendTextMessage(
      sender,
      "I'm not sure what you want. Can you be more specific yovip?"
    );
  } else if (fbService.isDefined(responseText)) {
    fbService.sendTextMessage(sender, responseText);
  }
}

async function resolveAfterXSeconds(x) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(x);
    }, x * 1000);
  });
}

async function greetUserText(userId) {
  await request({
    uri: "https://graph.facebook.com/v2.7/" + userId,
    qs: {
      access_token: config.FB_PAGE_TOKEN
    }
  },
    async function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var user = JSON.parse(body);
        var query = {
          "FbData.id": user.id
        },
          update = {
            dUpdatedDate: new Date()
          },
          options = {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
          };

        // Find the document
        UserModel.findOneAndUpdate(query, update, options).then(result => {
          result.sFbData = user;
          result.save().then(async (success) => {
            var responseText = `Hi! Nice to meet you ${user.first_name}. I'm yovip. Christian's Assistant.`
            var url = "https://scontent.xx.fbcdn.net/v/t1.15752-0/p280x280/42686629_507772776365057_3601089422088470528_n.jpg?_nc_cat=100&_nc_ad=z-m&_nc_cid=0&_nc_ht=scontent.xx&oh=446eec72884bb512b788203bd9c8e22d&oe=5CF2E920"
            fbService.sendTextMessage(user.id, responseText)


            var responseText2 = "What can i help you with today?";
            var qr = [{
              content_type: "text",
              title: "New Car 🚗",
              payload: "New Car yovip"
            },
            {
              content_type: "text",
              title: "Used Car purchase🚗",
              payload: "Used Car yo"
            }, {
              content_type: "text",
              title: "Schedule Service 🧰",
              payload: "Schedule Service y"
            }, {
              content_type: "text",
              title: "Referral Program 💸",
              payload: "Referral Program"
            }, {
              content_type: "text",
              title: "Contact 🤙",
              payload: "Contact"
            }
            ];
            fbService.sendImageMessage(user.id, url).then(() => {
              setTimeout(() => {
                fbService.sendQuickReply(user.id, responseText2, qr)
              }, 1000);
            })

          });
        });
      }
    }
  );
}

/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 *
 */
async function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  setSessionAndUser(senderID);

  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  var payload = event.postback.payload;
  console.log(payload)
  switch (payload) {
    case "FACEBOOK_WELCOME":
      greetUserText(senderID);
      break;
    case "Contact":
    case "REFERRALS":
    case "ABOUT":
      _.contact(senderID)
      break;
    case "USED_CAR":
      dialogflowService.sendTextQueryToDialogFlow(
        sessionIds,
        handleDialogFlowResponse,
        senderID,
        payload
      );
      break;

    case "NEW_CAR":
      dialogflowService.sendTextQueryToDialogFlow(
        sessionIds,
        handleDialogFlowResponse,
        senderID,
        payload
      );

      break;

    case "SERVICE":
      dialogflowService.sendTextQueryToDialogFlow(
        sessionIds,
        handleDialogFlowResponse,
        senderID,
        "service"
      );
      break;

    default:
      //unindentified payload
      fbService.sendTextMessage(
        senderID,
        "I'm not sure what you want. Can you be more specific vip?"
      );
      break;
  }
  console.info("Received postback");
}

// Spin up the server
app.listen(app.get("port"), function () {
  console.info("Magic Started on", app.get("port"));
});