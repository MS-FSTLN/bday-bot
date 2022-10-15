require('dotenv').config();

const tmi = require("tmi.js");
// Define configuration options
const opts = {
  identity: {
    username: process.env.BOT_USERNAME,
    password: process.env.OAUTH_TOKEN
  },
  channels: [process.env.CHANNEL_NAME]
};

// Create a client with our options
const client = new tmi.client(opts);
const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
const TOKEN_PATH = "token.json";
// Register our event handlers (defined below)
client.on("message", onMessageHandler);
client.on("connected", onConnectedHandler);

// Connect to Twitch:
client.connect({
    connection: {
        reconnect: true // This
    }
});

function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

function getlist() {
  fs.readFile("credentials.json", (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    // Authorize a client with credentials, then call the Google Calendar API.
    authorize(JSON.parse(content), listEvents);
  });
}

function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question("Enter the code from that page here: ", code => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function listEvents(auth) {
  var member = "";
  var todaynow = new Date();
  todaynow.setHours(todaynow.getHours() + 1);
  var starttoday = new Date();
  starttoday.setHours(starttoday.getHours() + 1);
  starttoday.setHours(0, 1, 0, 0);
  todaynow = new Date();
  todaynow.setHours(todaynow.getHours() + 1);
  //todaynow.setHours(23, 59, 59, 999);
  todaynow.setHours(15, 0, 0, 0);
  const calendar = google.calendar({ version: "v3", auth });
  const cal_req_param = {
    calendarId: "vru0ugbqpqi0hhtrfo6bru5d28@group.calendar.google.com",
    timeMin: starttoday.toISOString(),
    timeMax: todaynow.toISOString(),
    singleEvents: true,
    orderBy: "startTime"
  };
  calendar.events.list(cal_req_param, (err, res) => {
    if (err) return console.log("The API returned an error: " + err);
    const events = res.data.items;
    var answer = "";
    if (events.length == 0) {
      answer = "Heute hat leider niemand in der Wurstbude Geburtstag wurstFEDDICH";
    } else if (events.length == 1) {
      events.map((event, i) => {
        answer =
          "Heute hat @" +
          `${event.summary}` +
          " Geburtstag. Alles Gute wurstPARTY wurstPARTY wurstPARTY";
      });
    } else {
      const sumsonly = events.map(_event => _event.summary);
      var memberlist = "";
      for (member of sumsonly) {
        memberlist = memberlist + "@" + member + " ";
      }
      answer =
        "Heute haben " +
        memberlist +
        "Geburtstag. Alles Gute wurstPARTY wurstPARTY wurstPARTY";
    }
    console.log(starttoday);
    console.log(todaynow);
    console.log(answer);
    fs.writeFile("bday.tmp", answer, function(err) {
      if (err) throw err;
      console.log("Saved!");
    });
    console.log(events);
  });
}

var CooldownManager = {
  cooldownTime: 30000, // 30 seconds
  store: {
    '!geburtstag': 1493389555431,
  },

  canUse: function(commandName) {
    // Check if the last time you've used the command + 30 seconds has passed
    // (because the value is less then the current time)
    return this.store[commandName] + this.cooldownTime < Date.now();
  },

  touch: function(commandName) {
    // Store the current timestamp in the store based on the current commandName
    this.store[commandName] = Date.now();
  }
}

// Called every time a message comes in
function onMessageHandler(target, context, msg, self) {
  if (self) {
    return;
  } // Ignore messages from the bot

  // Remove whitespace from chat message
  const commandName = msg.trim();
  const lowerCommandName = commandName.toLowerCase();

  // If the command is known, let's execute it
  if (lowerCommandName.startsWith("!geburtstag") == true || lowerCommandName.startsWith("!bday") == true) {
    if (CooldownManager.canUse("!geburtstag")) {
      getlist();
//      sleep(2000);
      fs.readFile("bday.tmp", "utf8", function(err, contents) {
        const result = contents;
        client.say(target, result);
        console.log(result);
        CooldownManager.touch('!geburtstag');
      });
    }
    //client.say(target, result);
    console.log(`* Executed ${commandName} command`);
  } else {
    console.log(`* Unknown command ${commandName}`);
  }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}
getlist();
